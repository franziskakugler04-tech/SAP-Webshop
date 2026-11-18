sap.ui.define([
    "my/ui5/app/controller/BaseController"
], function (BaseController) {
    "use strict";

    QUnit.module("Base Controller");

    QUnit.test("Newsletter-Navigation sollte den Router aufrufen", function (assert) {
        var oController = new BaseController();
        var navCalled = false;

        oController.getRouter = function () {
            return {
                navTo: function (sName) {
                    navCalled = (sName === "newsletter");
                }
            };
        };

        oController.onNavToNewsletter();

        assert.strictEqual(navCalled, true, "Router wurde zur Newsletter-Route aufgerufen");
    });
});
