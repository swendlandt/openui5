/* global QUnit */

sap.ui.define([
	"sap/ui/core/Component",
	"sap/ui/core/Control",
	"sap/ui/fl/apply/_internal/changes/Reverter",
	"sap/ui/fl/apply/_internal/flexObjects/FlexObjectFactory",
	"sap/ui/fl/initial/api/Version",
	"sap/ui/fl/write/_internal/flexState/FlexObjectManager",
	"sap/ui/fl/write/_internal/Versions",
	"sap/ui/fl/ChangePersistenceFactory",
	"sap/ui/fl/FlexController",
	"sap/ui/fl/Layer",
	"sap/ui/model/json/JSONModel",
	"sap/ui/thirdparty/sinon-4"
], function(
	Component,
	Control,
	Reverter,
	FlexObjectFactory,
	Version,
	FlexObjectManager,
	Versions,
	ChangePersistenceFactory,
	FlexController,
	Layer,
	JSONModel,
	sinon
) {
	"use strict";

	var sandbox = sinon.createSandbox();

	var oComponent;

	function getLabelChangeContent(sFileName, sSelectorId, sChangeType) {
		return {
			fileType: "change",
			layer: Layer.USER,
			fileName: sFileName || "a",
			namespace: "b",
			packageName: "c",
			changeType: sChangeType || "labelChange",
			creation: "",
			reference: "",
			selector: {
				id: sSelectorId || "abc123"
			},
			content: {
				something: "createNewVariant"
			}
		};
	}

	var labelChangeContent = getLabelChangeContent("a");

	QUnit.module("sap.ui.fl.FlexController", {
		beforeEach() {
			this.oFlexController = new FlexController("testScenarioComponent", "1.2.3");
			this.oControl = new Control("existingId");
			this.oChange = FlexObjectFactory.createFromFileContent(labelChangeContent);
			if (!oComponent) {
				return Component.create({
					name: "testComponent",
					id: "testComponent",
					metadata: {
						manifest: "json"
					}
				}).then(function(oCreatedComponent) {
					oComponent = oCreatedComponent;
				});
			}
		},
		afterEach() {
			sandbox.restore();
			this.oControl.destroy();
			ChangePersistenceFactory._instanceCache = {};
		}
	}, function() {
		QUnit.test("when the constructor is called", function(assert) {
			assert.ok(this.oFlexController instanceof FlexController, "then an instance of FlexController was created");
		});

		QUnit.test("when saveAll is called with skipping the cache", function(assert) {
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, true)
			.then(function() {
				assert.ok(fnChangePersistenceSaveStub.calledWith(oComponent, true), "the app component, the layer and the flag were passed");
			});
		});

		QUnit.test("when saveAll is called with bCondenseAnyLayer", function(assert) {
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, false, false, Layer.VENDOR, false, true)
			.then(function() {
				assert.ok(fnChangePersistenceSaveStub.calledWith(oComponent, false, undefined, undefined, undefined, true, Layer.VENDOR), "the app component and the flag were passed");
			});
		});

		QUnit.test("when saveAll is called with a layer and bRemoveOtherLayerChanges", function(assert) {
			var oComp = {
				name: "testComp",
				getModel() {
					return {
						id: "variantModel"
					};
				}
			};
			sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			const aCurrentChanges = [
				{ id: "someChange" },
				{ id: "someOtherChange" }
			];
			const oRemoveStub = sandbox.stub(FlexObjectManager, "removeDirtyFlexObjects").returns(aCurrentChanges);
			const oRevertStub = sandbox.stub(Reverter, "revertMultipleChanges").resolves();
			return this.oFlexController.saveAll(oComp, true, false, Layer.CUSTOMER, true)
			.then(function() {
				const aLayersToReset = oRemoveStub.firstCall.args[0].layers;
				assert.ok(aLayersToReset.includes(Layer.USER), "then dirty changes on higher layers are removed");
				assert.ok(aLayersToReset.includes(Layer.VENDOR), "then dirty changes on lower layers are removed");
				assert.deepEqual(
					oRevertStub.firstCall.args[0],
					[...aCurrentChanges].reverse(),
					"then the changes are reverted in reverse order"
				);
			});
		});

		QUnit.test("when saveAll is called without versioning", function(assert) {
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, undefined, false)
			.then(function() {
				assert.equal(fnChangePersistenceSaveStub.calledWith(oComponent, undefined, undefined, undefined, undefined), true, "then ChangePersistence.saveDirtyChanges() was called with correct parameters");
			});
		});

		QUnit.test("when saveAll is called for a draft without filenames", function(assert) {
			sandbox.stub(Versions, "getVersionsModel").returns(new JSONModel({
				persistedVersion: Version.Number.Draft,
				versions: [{version: Version.Number.Draft, filenames: []}],
				draftFilenames: []
			}));
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, undefined, true)
			.then(function() {
				assert.equal(fnChangePersistenceSaveStub.calledWith(oComponent, undefined, undefined, Version.Number.Draft, []), true, "then ChangePersistence.saveDirtyChanges() was called with correct parameters");
			});
		});

		QUnit.test("when saveAll is called for a draft with filenames", function(assert) {
			var aFilenames = ["fileName1", "fileName2"];
			var oDraftVersion = {
				version: Version.Number.Draft,
				filenames: aFilenames
			};
			var oFirstVersion = {
				activatedBy: "qunit",
				activatedAt: "a long while ago",
				version: "versionGUID 1"
			};
			var aVersions = [
				oDraftVersion,
				oFirstVersion
			];
			sandbox.stub(Versions, "getVersionsModel").returns(new JSONModel({
				persistedVersion: Version.Number.Draft,
				versions: aVersions,
				draftFilenames: aFilenames
			}));
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, undefined, true)
			.then(function() {
				assert.equal(fnChangePersistenceSaveStub.calledWith(oComponent, undefined, undefined, Version.Number.Draft, aFilenames), true, "then ChangePersistence.saveDirtyChanges() was called with correct parameters");
			});
		});

		QUnit.test("when saveAll is called with skipping the cache and for draft", function(assert) {
			sandbox.stub(Versions, "getVersionsModel").returns(new JSONModel({
				persistedVersion: Version.Number.Original,
				versions: [{version: Version.Number.Original}]
			}));
			var fnChangePersistenceSaveStub = sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves();
			return this.oFlexController.saveAll(oComponent, true, true)
			.then(function() {
				assert.equal(fnChangePersistenceSaveStub.calledWith(oComponent, true, undefined, Version.Number.Original, undefined), true, "then ChangePersistence.saveDirtyChanges() was called with correct parameters");
			});
		});

		function _runSaveAllAndAssumeVersionsCall(assert, vResponse, nParentVersion, nCallCount, nCallCountUpdate) {
			sandbox.stub(Versions, "getVersionsModel").returns(new JSONModel({
				persistedVersion: nParentVersion
			}));
			var oVersionsStub = sandbox.stub(Versions, "onAllChangesSaved");
			var oVersionsUpdateStub = sandbox.stub(Versions, "updateModelFromBackend");
			var oResult = vResponse ? {response: vResponse} : undefined;
			sandbox.stub(this.oFlexController._oChangePersistence, "saveDirtyChanges").resolves(oResult);
			return this.oFlexController.saveAll(oComponent, undefined, nParentVersion !== false).then(function() {
				assert.equal(oVersionsStub.callCount, nCallCount);
				if (nCallCountUpdate) {
					assert.equal(oVersionsUpdateStub.callCount, nCallCountUpdate);
				}
				if (nParentVersion === Version.Number.Draft && vResponse && nCallCount) {
					assert.equal(oVersionsStub.args[0][0].draftFilenames.length, vResponse.length);
				}
			});
		}

		QUnit.test("when saveAll is called without draft and no change was saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, undefined, false, 0);
		});

		QUnit.test("when saveAll is called without draft and a change was saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, [{}], false, 0);
		});

		QUnit.test("when saveAll is called without draft and multiple changes were saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, [{}, {}], false, 0);
		});

		QUnit.test("when saveAll is called with draft and no change was saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, undefined, Version.Number.Draft, 0, 1);
		});

		QUnit.test("when saveAll is called with draft and a change was saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, [{reference: "my.app.Component", fileName: "draftname"}], Version.Number.Draft, 1, 0);
		});

		QUnit.test("when saveAll is called with draft and the last change is delete", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, [], Version.Number.Draft, 0, 1);
		});

		QUnit.test("when saveAll is called with draft and multiple changes were saved", function(assert) {
			return _runSaveAllAndAssumeVersionsCall.call(this, assert, [{reference: "my.app.Component", fileName: "draftname"}, {fileName: "secDraftname"}], Version.Number.Draft, 1, 0);
		});
	});

	QUnit.done(function() {
		document.getElementById("qunit-fixture").style.display = "none";
	});
});
