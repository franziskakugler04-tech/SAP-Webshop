sap.ui.define([], function () {
    "use strict";

    /*
     * Zentrale Prüfregeln für alle Nutzereingaben, damit dieselbe Eingabe überall gleich
     * bewertet wird. Rückgabe: "" bei gültigem Wert, sonst der i18n-Schlüssel der Meldung
     */

    var rEmail = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
    // Erlaubt sind Ziffern sowie die in Telefonnummern üblichen Trennzeichen
    var rPhone = /^[+0-9 /()-]{6,}$/;
    // Länderkürzel, zwei Prüfziffern, danach die nationale Kontonummer
    var rIban = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

    /**
     * Entfernt Leerzeichen am Rand und verträgt undefined/null, weil
     * Modellfelder vor der ersten Eingabe leer sein können
     * @param {string} sValue
     * @returns {string}
     */
    function trim(sValue) {
        return (sValue || "").trim();
    }

    return {

        /**
         * Pflichtfeld: darf nicht leer sein
         * @param {string} sValue
         * @returns {string} i18n-Key oder ""
         */
        checkRequired: function (sValue) {
            return trim(sValue) === "" ? "validationRequired" : "";
        },

        /**
         * E-Mail-Adresse: Pflichtfeld mit Formatprüfung
         * @param {string} sValue
         * @returns {string} i18n-Key oder ""
         */
        checkEmail: function (sValue) {
            var sTrimmed = trim(sValue);
            if (sTrimmed === "") {
                return "validationRequired";
            }
            return rEmail.test(sTrimmed) ? "" : "validationEmail";
        },

        /**
         * Passwort: mindestens 8 Zeichen, davon ein Großbuchstabe und eine Ziffer
         * @param {string} sValue
         * @returns {string} i18n-Key oder ""
         */
        checkPassword: function (sValue) {
            var sTrimmed = trim(sValue);
            if (sTrimmed === "") {
                return "validationRequired";
            }
            if (sTrimmed.length < 8 || !/[A-ZÄÖÜ]/.test(sTrimmed) || !/\d/.test(sTrimmed)) {
                return "validationPassword";
            }
            return "";
        },

        /**
         * Wiederholtes Passwort: muss mit dem ersten übereinstimmen
         * @param {string} sPassword
         * @param {string} sRepeat
         * @returns {string} i18n-Key oder ""
         */
        checkPasswordRepeat: function (sPassword, sRepeat) {
            if (trim(sRepeat) === "") {
                return "validationRequired";
            }
            return sPassword === sRepeat ? "" : "validationPasswordRepeat";
        },

        /**
         * Telefonnummer: freiwillig, wird nur geprüft, wenn etwas eingetragen ist
         * @param {string} sValue
         * @returns {string} i18n-Key oder ""
         */
        checkPhone: function (sValue) {
            var sTrimmed = trim(sValue);
            if (sTrimmed === "") {
                return "";
            }
            return rPhone.test(sTrimmed) ? "" : "validationPhone";
        },

        /**
         * Postleitzahl: Deutschland hat fünf, Österreich und die Schweiz vier Ziffern
         * @param {string} sValue
         * @param {string} sCountry Länderkürzel DE, AT oder CH
         * @returns {string} i18n-Key oder ""
         */
        checkPostalCode: function (sValue, sCountry) {
            var sTrimmed = trim(sValue);
            if (sTrimmed === "") {
                return "validationRequired";
            }
            if (sCountry === "DE") {
                return /^\d{5}$/.test(sTrimmed) ? "" : "validationPostalCodeDe";
            }
            return /^\d{4}$/.test(sTrimmed) ? "" : "validationPostalCodeAtCh";
        },

        /**
         * IBAN: Leerzeichen sind erlaubt, weil IBANs oft in Vierergruppen notiert werden
         * @param {string} sValue
         * @returns {string} i18n-Key oder ""
         */
        checkIban: function (sValue) {
            var sIban = trim(sValue).replace(/\s/g, "").toUpperCase();
            if (sIban === "") {
                return "validationRequired";
            }
            return rIban.test(sIban) ? "" : "validationIban";
        },

        /**
         * Kreditkartennummer: 16 Ziffern, Leerzeichen zur Gruppierung erlaubt
         * @param {string} sValue
         * @returns {string} i18n-Key oder ""
         */
        checkCardNumber: function (sValue) {
            var sDigits = trim(sValue).replace(/\s/g, "");
            if (sDigits === "") {
                return "validationRequired";
            }
            return /^\d{16}$/.test(sDigits) ? "" : "validationCardNumber";
        },

        /**
         * Gültigkeitsdatum der Kreditkarte im Format MM/JJ, darf nicht abgelaufen sein
         * @param {string} sValue
         * @returns {string} i18n-Key oder ""
         */
        checkCardExpiry: function (sValue) {
            var sTrimmed = trim(sValue);
            if (sTrimmed === "") {
                return "validationRequired";
            }
            var aParts = /^(\d{2})\/(\d{2})$/.exec(sTrimmed);
            if (!aParts) {
                return "validationCardExpiry";
            }
            var iMonth = parseInt(aParts[1], 10);
            if (iMonth < 1 || iMonth > 12) {
                return "validationCardExpiry";
            }
            // Tag 0 des Folgemonats ist der letzte Tag des angegebenen Monats -
            // die Karte gilt bis zu dessen Ende
            var oExpiry = new Date(2000 + parseInt(aParts[2], 10), iMonth, 0, 23, 59, 59);
            return oExpiry < new Date() ? "validationCardExpired" : "";
        },

        /**
         * Prüfziffer der Kreditkarte: genau drei Ziffern
         * @param {string} sValue
         * @returns {string} i18n-Key oder ""
         */
        checkCardCvc: function (sValue) {
            var sTrimmed = trim(sValue);
            if (sTrimmed === "") {
                return "validationRequired";
            }
            return /^\d{3}$/.test(sTrimmed) ? "" : "validationCardCvc";
        }
    };
});
