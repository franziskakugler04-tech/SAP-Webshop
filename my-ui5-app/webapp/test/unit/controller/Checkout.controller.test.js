sap.ui.define([
    "my/ui5/app/controller/Checkout.controller"
], function (CheckoutController) {
    "use strict";

    QUnit.module("Checkout Controller");

    QUnit.test("_maskValue zeigt nur die letzten vier Zeichen einer Nummer", function (assert) {
        var oController = new CheckoutController();

        assert.strictEqual(oController._maskValue("1234 5678 9012 3456"), "•••• 3456", "Leerzeichen werden entfernt, nur die letzten 4 Ziffern bleiben sichtbar");
        assert.strictEqual(oController._maskValue(""), "", "Leerer Wert bleibt leer");
    });

    QUnit.test("_getShippingPrice liefert den Preis der gewählten Versandart, sonst 0", function (assert) {
        var oController = new CheckoutController();

        var aOptions = [
            { ShippingId: "STD", Price: 4.99 },
            { ShippingId: "EXP", Price: 9.99 }
        ];

        oController.getModel = function (sName) {
            if (sName === "shipping") {
                return { getProperty: function () { return aOptions; } };
            }
            return { getProperty: function () { return "EXP"; } };
        };
        assert.strictEqual(oController._getShippingPrice(), 9.99, "Preis der gewählten Versandart wird gefunden");

        oController.getModel = function (sName) {
            if (sName === "shipping") {
                return { getProperty: function () { return aOptions; } };
            }
            return { getProperty: function () { return "UNKNOWN"; } };
        };
        assert.strictEqual(oController._getShippingPrice(), 0, "Unbekannte Versandart liefert 0");
    });

    QUnit.test("onCartItemDelete navigiert zurück in den Shop, wenn der Warenkorb danach leer ist", function (assert) {
        var oController = new CheckoutController();

        oController.removeFromCart = function () { };
        oController.getCartItems = function () { return []; };

        var oNavToCall = null;
        oController.getRouter = function () {
            return {
                navTo: function (sName, oParams, bReplace) {
                    oNavToCall = { name: sName, replace: bReplace };
                }
            };
        };
        oController._refreshTotals = function () {
            assert.ok(false, "_refreshTotals darf bei leerem Warenkorb nicht mehr aufgerufen werden");
        };

        var oFakeEvent = {
            getParameter: function () {
                return {
                    getBindingContext: function () {
                        return { getObject: function () { return { ProductId: "P1" }; } };
                    }
                };
            }
        };

        oController.onCartItemDelete(oFakeEvent);

        assert.strictEqual(oNavToCall.name, "products", "Es wird zurück zur Produktübersicht navigiert");
        assert.strictEqual(oNavToCall.replace, true, "Navigation ersetzt die Historie (replace)");
    });
});