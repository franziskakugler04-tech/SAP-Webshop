sap.ui.define([
    "my/ui5/app/controller/Main.controller"
], function (MainController) {
    "use strict";

    QUnit.module("Main Controller");

    QUnit.test("Sollte instanziierbar sein", function (assert) {
        var oController = new MainController();
        assert.ok(oController, "Controller wurde erstellt");
    });

    QUnit.test("onCategoryTilePress navigiert mit der Kategorie aus den CustomData", function (assert) {
        var oController = new MainController();
        var oNavToCall = null;

        oController.getRouter = function () {
            return {
                navTo: function (sName, oParams) {
                    oNavToCall = { name: sName, params: oParams };
                }
            };
        };

        var oFakeEvent = {
            getSource: function () {
                return {
                    data: function (sKey) {
                        return sKey === "categoryId" ? "Ordner" : undefined;
                    }
                };
            }
        };

        oController.onCategoryTilePress(oFakeEvent);

        assert.strictEqual(oNavToCall.name, "products", "Route 'products' wurde aufgerufen");
        assert.strictEqual(oNavToCall.params.category, "Ordner", "Kategorie aus CustomData wurde übernommen");
    });

    QUnit.test("onNavToProduct navigiert mit Kategorie und ProductId des Neuheiten-Produkts", function (assert) {
        var oController = new MainController();
        var oNavToCall = null;

        oController.getRouter = function () {
            return {
                navTo: function (sName, oParams) {
                    oNavToCall = { name: sName, params: oParams };
                }
            };
        };

        var oFakeProduct = { Category: "Schreibwaren", ProductId: "P001" };
        var oFakeEvent = {
            getSource: function () {
                return {
                    getBindingContext: function () {
                        return {
                            getObject: function () {
                                return oFakeProduct;
                            }
                        };
                    }
                };
            }
        };

        oController.onNavToProduct(oFakeEvent);

        assert.strictEqual(oNavToCall.name, "productDetail", "Route 'productDetail' wurde aufgerufen");
        assert.strictEqual(oNavToCall.params.category, "Schreibwaren", "Kategorie wurde übernommen");
        assert.strictEqual(oNavToCall.params.productId, "P001", "ProductId wurde übernommen");
    });

    QUnit.test("_loadNewProducts übernimmt die letzten 6 Produkte in umgekehrter Reihenfolge", function (assert) {
        var oController = new MainController();
        var oSetModelCall = null;

        oController.setModel = function (oModel, sName) {
            oSetModelCall = { model: oModel, name: sName };
        };

        var aProducts = [];
        for (var i = 1; i <= 8; i++) {
            aProducts.push({ ProductId: "P00" + i });
        }

        oController._loadNewProducts(aProducts);

        var aItems = oSetModelCall.model.getData().Items;
        assert.strictEqual(oSetModelCall.name, "newProducts", "Model wird unter 'newProducts' gesetzt");
        assert.strictEqual(aItems.length, 6, "Es werden genau 6 Produkte übernommen");
        assert.strictEqual(aItems[0].ProductId, "P008", "Das neueste Produkt steht an erster Stelle");
        assert.strictEqual(aItems[5].ProductId, "P003", "Das älteste der 6 Produkte steht an letzter Stelle");
    });
});