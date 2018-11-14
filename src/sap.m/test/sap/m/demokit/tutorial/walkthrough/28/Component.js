sap.ui.define(['sap/ui/core/UIComponent'],
	function (UIComponent) {
		"use strict";

		var Component = UIComponent.extend("sap.m.tutorial.walkthrough.28.Component", {

			metadata: {
				config: {
					sample: {
						iframe: "webapp/test/unit/unitTests.qunit.html",
						stretch: true,
						files: [
							"webapp/controller/App.controller.js",
							"webapp/controller/HelloDialog.js",
							"webapp/controller/HelloPanel.controller.js",
							"webapp/controller/InvoiceList.controller.js",
							"webapp/css/style.css",
							"webapp/i18n/i18n.properties",
							"webapp/localService/mockdata/Invoices.json",
							"webapp/localService/metadata.xml",
							"webapp/localService/mockserver.js",
							"webapp/model/formatter.js",
							"webapp/view/App.view.xml",
							"webapp/view/HelloDialog.fragment.xml",
							"webapp/view/HelloPanel.view.xml",
							"webapp/view/InvoiceList.view.xml",
							"webapp/Component.js",
							"webapp/index.html",
							"webapp/manifest.json",
							"webapp/test/mockServer.html",
							"webapp/test/unit/model/formatter.js",
							"webapp/test/unit/unitTests.qunit.html",
							"ui5.yaml",
							"package.json"
						]
					}
				}
			}

		});

		return Component;

	});