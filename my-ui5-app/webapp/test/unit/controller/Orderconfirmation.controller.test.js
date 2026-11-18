sap.ui.define([
    "my/ui5/app/controller/OrderConfirmation.controller",
    "my/ui5/app/model/cart"
], function (OrderConfirmationController, cart) {
    "use strict";

    QUnit.module("OrderConfirmation Controller");

    QUnit.test("_onRouteMatched navigiert zurück zur Startseite, wenn keine letzte Bestellung vorliegt", function (assert) {
        var oController = new OrderConfirmationController();

        // cart.loadLastOrder() greift auf den Browser-Speicher zu - für den
        // Test wird die Funktion kurz durch eine feste Rückgabe ersetzt und
        // danach wiederhergestellt, damit andere Tests nicht beeinflusst werden.
        var fnOriginalLoadLastOrder = cart.loadLastOrder;
        cart.loadLastOrder = function () { return null; };

        var oNavToCall = null;
        oController.getRouter = function () {
            return {
                navTo: function (sName, oParams, bReplace) {
                    oNavToCall = { name: sName, replace: bReplace };
                }
            };
        };

        oController._onRouteMatched();

        assert.strictEqual(oNavToCall.name, "main", "Es wird zur Startseite navigiert");
        assert.strictEqual(oNavToCall.replace, true, "Navigation ersetzt die Historie (replace)");

        cart.loadLastOrder = fnOriginalLoadLastOrder;
    });
});