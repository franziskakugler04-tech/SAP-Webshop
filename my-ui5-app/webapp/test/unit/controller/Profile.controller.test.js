sap.ui.define([
    "my/ui5/app/controller/Profile.controller"
], function (ProfileController) {
    "use strict";

    QUnit.module("Profile Controller");

    QUnit.test("_getValuePath liefert den Standardpfad oder den hinterlegten Sonderpfad", function (assert) {
        var oController = new ProfileController();

        assert.strictEqual(oController._getValuePath("FirstName"), "/Value", "Textfelder nutzen den gemeinsamen Zwischenspeicher");
        assert.strictEqual(oController._getValuePath("Address/Country"), "/CountryValue", "Das Land-Select nutzt seinen eigenen Pfad");
        assert.strictEqual(oController._getValuePath("Payment/Type"), "/PaymentTypeValue", "Die Zahlungsart nutzt ihren eigenen Pfad");
    });

    QUnit.test("_checkCurrentPassword erkennt ein falsches bisheriges Passwort", function (assert) {
        var oController = new ProfileController();

        oController.getModel = function () {
            return { getProperty: function () { return "richtig123"; } };
        };

        assert.strictEqual(oController._checkCurrentPassword("richtig123"), "", "Korrektes Passwort wird akzeptiert");
        assert.strictEqual(oController._checkCurrentPassword("falsch"), "profilePasswordWrong", "Falsches Passwort wird erkannt");
    });

    QUnit.test("_setFieldState markiert Felder ohne Wertstatus (z. B. Zahlungsart) nicht", function (assert) {
        var oController = new ProfileController();

        var bSetFieldStateCalled = false;
        oController.setFieldState = function () {
            bSetFieldStateCalled = true;
            return false;
        };

        var bResult = oController._setFieldState("Payment/Type", "someError");

        assert.ok(bResult, "Felder ohne Wertstatus gelten immer als gültig");
        assert.notOk(bSetFieldStateCalled, "setFieldState wird für sie nicht aufgerufen");
    });
});