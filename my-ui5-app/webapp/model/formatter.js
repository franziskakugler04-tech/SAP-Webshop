sap.ui.define([
    "./cart"
], function (cart) {
    "use strict";

    /**
     * Formatiert einen Betrag als Preis in Euro. Lokale Funktion, weil UI5 einen
     * Formatter mit dem Control als "this" aufruft und ihn sonst nicht fände
     * @param {float} fPrice
     * @returns {string}
     */
    function formatPrice(fPrice) {
        if (fPrice === undefined || fPrice === null) {
            return "";
        }
        return fPrice.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + " €";
    }

    return {

        /**
         * Formatiert den Lagerbestand als Statustext
         * @param {int} iStock
         * @returns {string}
         */
        formatStockState: function (iStock) {
            if (iStock === undefined || iStock === null) {
                return "None";
            }
            if (iStock === 0) {
                return "Error";
            }
            if (iStock < 20) {
                return "Warning";
            }
            return "Success";
        },

        formatPrice: formatPrice,

        /**
         * Preis einer Warenkorbposition, also Stückpreis mal Menge
         * @param {float} fPrice Stückpreis
         * @param {int} iQuantity Menge
         * @returns {string}
         */
        formatLinePrice: function (fPrice, iQuantity) {
            return formatPrice(fPrice * iQuantity);
        },

        /**
         * Zwischensumme des Warenkorbs. Gebunden wird an /Items statt an eine
         * gespeicherte Summe, damit die Anzeige von selbst stimmt
         * @param {object[]} aItems Positionen des Warenkorbs
         * @returns {string}
         */
        formatCartTotal: function (aItems) {
            return formatPrice(cart.getSubtotal(aItems || []));
        },

        /**
         * Voraussichtliches Lieferdatum ab heute. Gezählt werden Kalendertage,
         * keine Werktage - bewusste Vereinfachung ohne Backend
         * @param {int} iDays Lieferdauer der Versandart
         * @returns {string} Datum im Format TT.MM.JJ
         */
        formatDeliveryDate: function (iDays) {
            if (iDays === undefined || iDays === null) {
                return "";
            }

            var oDate = new Date();
            oDate.setDate(oDate.getDate() + iDays);

            return oDate.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit"
            });
        }
    };
});
