sap.ui.define([
    "./BaseController",
    "../model/models",
    "../model/formatter",
    "sap/ui/model/json/JSONModel"
], function (BaseController, models, formatter, JSONModel) {
    "use strict";

    return BaseController.extend("my.ui5.app.controller.Main", {

        formatter: formatter,

        /**
         * Lädt die Produkt-Mockdaten und baut daraus das "Neuheiten"-Modell auf
         */
        onInit: function () {
            var oProductsModel = models.createProductsModel();
            this.setModel(oProductsModel, "products");

            oProductsModel.dataLoaded().then(function () {
                this._loadNewProducts(oProductsModel.getData().Products);
            }.bind(this));
        },

        /**
         * Füllt den Neuheiten-Bereich mit den letzten sechs Produkten der Mockdaten
         * @param {object[]} aProducts kompletter Produktkatalog
         */
        _loadNewProducts: function (aProducts) {
            var aAll = aProducts || [];
            var aNewest = aAll.slice(-6).reverse();

            this.setModel(new JSONModel({ Items: aNewest }), "newProducts");
        },

        /**
         * Führt von einer Kategorie-Kachel gefiltert zur Produktübersicht; die
         * Kategorie-Id steht in den CustomData der Kachel
         * @param {sap.ui.base.Event} oEvent
         */
        onCategoryTilePress: function (oEvent) {
            var oTile = oEvent.getSource();
            var sCategoryId = oTile.data("categoryId");

            this.getRouter().navTo("products", {
                category: sCategoryId
            });
        },

        /**
         * Navigiert ungefiltert zur Produktübersicht
         */
        onNavToProducts: function () {
            this.getRouter().navTo("products");
        },

        /**
         * Führt von einer Neuheiten-Kachel zur Detailseite des Produkts
         * @param {sap.ui.base.Event} oEvent
         */
        onNavToProduct: function (oEvent) {
            var oProduct = oEvent.getSource().getBindingContext("newProducts").getObject();

            this.getRouter().navTo("productDetail", {
                category: oProduct.Category,
                productId: oProduct.ProductId
            });
        }
    });
});