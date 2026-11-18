sap.ui.define([
    "my/ui5/app/controller/ProductDetail.controller"
], function (ProductDetailController) {
    "use strict";

    QUnit.module("ProductDetail Controller");

    QUnit.test("onSubmitRating markiert die Bewertung als abgesendet und erhöht RatingCount", function (assert) {
        var oController = new ProductDetailController();
        oController._sProductId = "P001";
        oController._oRatingState = {};

        var oData = { userRatingValue: 4, RatingCount: 10 };
        var oFakeModel = {
            getProperty: function (sPath) {
                return sPath === "/userRatingValue" ? oData.userRatingValue : oData.RatingCount;
            },
            setProperty: function (sPath, vValue) {
                if (sPath === "/userRatingSubmitted") {
                    oData.userRatingSubmitted = vValue;
                } else if (sPath === "/RatingCount") {
                    oData.RatingCount = vValue;
                }
            }
        };

        oController.getModel = function () {
            return oFakeModel;
        };

        oController.onSubmitRating();

        assert.strictEqual(oData.userRatingSubmitted, true, "Bewertung gilt als abgesendet");
        assert.strictEqual(oData.RatingCount, 11, "RatingCount wurde um 1 erhöht");
        assert.deepEqual(oController._oRatingState.P001, { submitted: true, value: 4 }, "Bewertungsstatus wird für spätere Aufrufe gemerkt");
    });

    QUnit.test("_showProductFromRoute navigiert zurück zur Übersicht, wenn die ProductId unbekannt ist", function (assert) {
        var oController = new ProductDetailController();
        oController._sProductId = "P999";
        oController._sCategoryId = "Ordner";
        oController._aAllProducts = [{ ProductId: "P001" }];

        var oNavToCall = null;
        oController.getRouter = function () {
            return {
                navTo: function (sName, oParams) {
                    oNavToCall = { name: sName, params: oParams };
                }
            };
        };

        oController._showProductFromRoute();

        assert.strictEqual(oNavToCall.name, "products", "Es wird zur Produktübersicht navigiert");
        assert.strictEqual(oNavToCall.params.category, "Ordner", "Die zuletzt bekannte Kategorie wird als Filter mitgegeben");
    });

    QUnit.test("onFavoritePress übergibt das aktuell angezeigte Produkt an toggleWishlistItem", function (assert) {
        var oController = new ProductDetailController();
        var oFakeProduct = { ProductId: "P001", Name: "Kugelschreiber" };

        oController.getModel = function () {
            return {
                getData: function () {
                    return oFakeProduct;
                }
            };
        };

        var oPassedProduct = null;
        oController.toggleWishlistItem = function (oProduct) {
            oPassedProduct = oProduct;
        };

        oController.onFavoritePress();

        assert.strictEqual(oPassedProduct, oFakeProduct, "Das Produkt aus dem 'product'-Model wird an toggleWishlistItem übergeben");
    });
});