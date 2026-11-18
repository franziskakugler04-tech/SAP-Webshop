sap.ui.define([], function () {
    "use strict";

    /*
     * Kapselt den localStorage an einer Stelle, weil die App ohne Backend auskommt.
     * Das try/catch hält sie am Laufen, wenn der Browser den Speicher sperrt
     */

    return {

        /**
         * Liest einen Eintrag und wandelt ihn von JSON in ein Objekt um
         * @param {string} sKey Schlüssel im localStorage
         * @param {any} vDefault Rückgabewert, wenn nichts Brauchbares gespeichert ist
         * @returns {any}
         */
        read: function (sKey, vDefault) {
            try {
                var sRaw = window.localStorage.getItem(sKey);
                return sRaw === null ? vDefault : JSON.parse(sRaw);
            } catch (oError) {
                return vDefault;
            }
        },

        /**
         * Schreibt einen Wert als JSON in den localStorage
         * @param {string} sKey Schlüssel im localStorage
         * @param {any} vValue zu speichernder Wert
         */
        write: function (sKey, vValue) {
            try {
                window.localStorage.setItem(sKey, JSON.stringify(vValue));
            } catch (oError) {
                // Schlägt das Speichern fehl, läuft die App ohne Persistenz weiter
            }
        },

        /**
         * Entfernt einen Eintrag
         * @param {string} sKey Schlüssel im localStorage
         */
        remove: function (sKey) {
            try {
                window.localStorage.removeItem(sKey);
            } catch (oError) {
                // Ohne localStorage gibt es auch nichts zu entfernen
            }
        }
    };
});
