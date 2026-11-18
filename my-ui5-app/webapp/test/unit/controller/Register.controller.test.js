sap.ui.define([
    "my/ui5/app/controller/Register.controller"
], function (RegisterController) {
    "use strict";

    QUnit.module("Register Controller");

    QUnit.test("_buildUser erstellt einen Benutzer-Datensatz mit getrimmten Werten und korrekter Anrede", function (assert) {
        var oController = new RegisterController();

        var oRegistrationData = {
            SalutationIndex: 1, // HERR
            FirstName: "  Max  ",
            LastName: "  Mustermann ",
            Email: " max@test.de ",
            Phone: " 0123456 ",
            Password: "geheim123",
            AcceptedTerms: true,
            Newsletter: false,
            DiscountInfo: true,
            Address: { Country: "DE", City: " Berlin ", PostalCode: " 12345 ", Street: " Hauptstr. 1 ", CompanyName: "" },
            Payment: { Type: "SEPA", AccountHolder: " Max Mustermann ", Iban: " DE123 ", CardHolder: "", CardNumber: "", CardExpiry: "", PaypalEmail: "" }
        };

        oController.getModel = function (sName) {
            assert.strictEqual(sName, "registration", "registration-Model wird angefragt");
            return { getData: function () { return oRegistrationData; } };
        };

        var oUser = oController._buildUser();

        assert.strictEqual(oUser.Salutation, "HERR", "Anrede wird über den Index aufgelöst");
        assert.strictEqual(oUser.FirstName, "Max", "Vorname wird getrimmt");
        assert.strictEqual(oUser.Address.City, "Berlin", "Stadt wird getrimmt");
        assert.strictEqual(oUser.Payment.Iban, "DE123", "IBAN wird getrimmt");
        assert.ok(oUser.UserId.indexOf("U") === 0, "UserId beginnt mit U");
    });

    QUnit.test("_validateAddress erlaubt eine komplett leere Adresse", function (assert) {
        var oController = new RegisterController();

        oController.getModel = function () {
            return { getProperty: function () { return { City: "", PostalCode: "", Street: "", CompanyName: "" }; } };
        };

        var aClearedFields = [];
        oController.setFieldState = function (sId, sMsg) {
            aClearedFields.push(sId);
            assert.strictEqual(sMsg, "", "Feld wird ohne Fehlermeldung zurückgesetzt");
            return true;
        };

        var bResult = oController._validateAddress();

        assert.ok(bResult, "Leere Adresse gilt als gültig");
        assert.deepEqual(
            aClearedFields,
            ["registerCityInput", "registerPostalCodeInput", "registerStreetInput"],
            "Alle Adressfelder werden zurückgesetzt"
        );
    });

    QUnit.test("_validatePayment räumt bei unberührter Zahlungsart alle Zahlungsarten auf, nicht nur die gewählte", function (assert) {
        var oController = new RegisterController();

        oController.getModel = function () {
            return {
                getProperty: function () {
                    return { Type: "CARD", CardHolder: "", CardNumber: "", CardExpiry: "", CardCvc: "" };
                }
            };
        };

        var aClearedIds = [];
        oController.setFieldState = function (sId, sMsg) {
            aClearedIds.push(sId);
            assert.strictEqual(sMsg, "", "Feld wird ohne Fehlermeldung zurückgesetzt");
            return true;
        };

        var bResult = oController._validatePayment();

        assert.ok(bResult, "Unberührte Zahlungsart gilt als gültig");
        assert.ok(
            aClearedIds.indexOf("registerIbanInput") !== -1,
            "Auch Felder anderer Zahlungsarten (z. B. IBAN von SEPA) werden geräumt"
        );
    });
});