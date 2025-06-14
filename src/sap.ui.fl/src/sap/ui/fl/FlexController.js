/*!
 * ${copyright}
 */

sap.ui.define([
	"sap/ui/core/util/reflection/JsControlTreeModifier",
	"sap/ui/fl/apply/_internal/changes/Reverter",
	"sap/ui/fl/write/_internal/flexState/FlexObjectManager",
	"sap/ui/fl/write/_internal/Versions",
	"sap/ui/fl/ChangePersistenceFactory",
	"sap/ui/fl/Layer"
], function(
	JsControlTreeModifier,
	Reverter,
	FlexObjectManager,
	Versions,
	ChangePersistenceFactory,
	Layer
) {
	"use strict";

	async function revertChangesAndUpdateVariantModel(oAppComponent, sReference, aChanges) {
		if (aChanges.length !== 0) {
			await Reverter.revertMultipleChanges(
				// Always revert changes in reverse order
				[...aChanges].reverse(),
				{
					appComponent: oAppComponent,
					modifier: JsControlTreeModifier,
					reference: sReference
				}
			);
		}
	}

	/**
	 * Retrieves changes (LabelChange, etc.) for an sap.ui.core.mvc.View and applies these changes
	 *
	 * @param {string} sComponentName - Component name the flexibility controller is responsible for
	 * @constructor
	 * @class
	 * @alias sap.ui.fl.FlexController
	 * @since 1.27.0
	 * @private
	 * @author SAP SE
	 * @version ${version}
	 */
	var FlexController = function(sComponentName) {
		this._oChangePersistence = undefined;
		this._sComponentName = sComponentName || "";
		if (this._sComponentName) {
			this._oChangePersistence = ChangePersistenceFactory.getChangePersistenceForComponent(this._sComponentName);
		}
	};

	FlexController.prototype._removeOtherLayerChanges = async function(oAppComponent, sLayer, bRemoveOtherLayerChanges) {
		if (bRemoveOtherLayerChanges && sLayer) {
			var aLayersToReset = Object.values(Layer).filter(function(sLayerToCheck) {
				return sLayerToCheck !== sLayer;
			});
			const sReference = this._sComponentName;
			const aRemovedChanges = FlexObjectManager.removeDirtyFlexObjects({
				reference: sReference,
				layers: aLayersToReset,
				component: oAppComponent
			});
			await revertChangesAndUpdateVariantModel(oAppComponent, sReference, aRemovedChanges);
			return aRemovedChanges;
		}
		return undefined;
	};

	/**
	 * Saves all changes of a persistence instance.
	 *
	 * @param {sap.ui.core.UIComponent} [oAppComponent] - AppComponent instance
	 * @param {boolean} [bSkipUpdateCache=false] - Indicates the cache should not be updated
	 * @param {boolean} [bDraft=false] - Indicates if changes should be written as a draft
	 * @param {string} [sLayer] - Layer for which the changes should be saved
	 * @param {boolean} [bRemoveOtherLayerChanges=false] - Whether to remove changes on other layers before saving
	 * @param {boolean} [bCondenseAnyLayer] - This will enable condensing regardless of the current layer
	 * @returns {Promise} resolving with an array of responses or rejecting with the first error
	 * @public
	 */
	FlexController.prototype.saveAll = function(
		oAppComponent,
		bSkipUpdateCache,
		bDraft,
		sLayer,
		bRemoveOtherLayerChanges,
		bCondenseAnyLayer
	) {
		var sParentVersion;
		var aDraftFilenames;
		if (bDraft) {
			var oVersionModel = Versions.getVersionsModel({
				reference: this._sComponentName,
				layer: Layer.CUSTOMER // only the customer layer has draft active
			});
			sParentVersion = oVersionModel.getProperty("/persistedVersion");
			aDraftFilenames = oVersionModel.getProperty("/draftFilenames");
		}
		return this._removeOtherLayerChanges(oAppComponent, sLayer, bRemoveOtherLayerChanges)
		.then(this._oChangePersistence.saveDirtyChanges.bind(
			this._oChangePersistence,
			oAppComponent,
			bSkipUpdateCache,
			undefined,
			sParentVersion,
			aDraftFilenames,
			bCondenseAnyLayer,
			sLayer
		))
		.then(function(oResult) {
			if (bDraft) {
				var mPropertyBag = {
					reference: this._sComponentName,
					layer: Layer.CUSTOMER // only the customer layer has draft active
				};
				// TODO: array as response is bad practice, should be changed to an object
				if (oResult?.response && oResult.response.length > 0) {
					var aDraftFilenames = [];
					if (Array.isArray(oResult.response)) {
						oResult.response.forEach(function(change) {
							aDraftFilenames.push(change.fileName);
						});
					}
					mPropertyBag.draftFilenames = aDraftFilenames;
					Versions.onAllChangesSaved(mPropertyBag);
				} else {
					// need to update version model when condensing send post request with a delete change and afterwards call flex/data request with right version parameter
					return Versions.updateModelFromBackend(mPropertyBag);
				}
			}
			return oResult;
		}.bind(this));
	};

	return FlexController;
});
