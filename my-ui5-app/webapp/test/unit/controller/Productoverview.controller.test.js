sap.ui.define([
    "my/ui5/app/controller/ProductOverview.controller"
], function (ProductOverviewController) {
    "use strict";

    QUnit.module("ProductOverview Controller");

    QUnit.test("_sortProducts sortiert nach priceAsc anhand des effektiven Preises (Angebotspreis bei IsOnSale)", function (assert) {
        var oController = new ProductOverviewController();

        var aProducts = [
            { ProductId: "P1", Price: 10, IsOnSale: false },
            { ProductId: "P2", Price: 20, OnSalePrice: 5, IsOnSale: true },
            { ProductId: "P3", Price: 8, IsOnSale: false }
        ];

        var aSorted = oController._sortProducts(aProducts, "priceAsc");

        assert.strictEqual(aSorted[0].ProductId, "P2", "Angebotsprodukt mit niedrigstem effektivem Preis steht vorne");
        assert.strictEqual(aSorted[1].ProductId, "P3", "Danach folgt das nächstgünstigste Produkt");
        assert.strictEqual(aSorted[2].ProductId, "P1", "Teuerstes Produkt steht hinten");

        // Original-Array darf nicht verändert werden
        assert.strictEqual(aProducts[0].ProductId, "P1", "Original-Array bleibt unverändert");
    });

    QUnit.test("_productMatchesFilters lehnt Produkte einer anderen Kategorie ab", function (assert) {
        var oController = new ProductOverviewController();
        oController._sCategoryId = "Ordner";

        var oFakeControl = {
            getValue: function () { return ""; },
            getSelectedKey: function () { return ""; },
            getRange: function () { return [0, 100]; },
            getSelected: function () { return false; }
        };

        oController.byId = function () {
            return oFakeControl;
        };

        var oProductWrongCategory = { Category: "Schreibwaren", Manufacturer: "Foo", Price: 5, RatingCount: 1 };
        var oProductRightCategory = { Category: "Ordner", Manufacturer: "Foo", Price: 5, RatingCount: 1 };

        assert.notOk(oController._productMatchesFilters(oProductWrongCategory), "Produkt aus anderer Kategorie wird ausgefiltert");
        assert.ok(oController._productMatchesFilters(oProductRightCategory), "Produkt der aktiven Kategorie besteht den Filter");
    });

    QUnit.test("onNextPage erhöht die Seite nur bis zur letzten Seite und ruft danach _refreshProductList nicht mehr auf", function (assert) {
        var oController = new ProductOverviewController();
        oController._iCurrentPage = 1;

        var iRefreshCalls = 0;
        oController._refreshProductList = function () {
            iRefreshCalls++;
        };

        oController.getModel = function (sName) {
            assert.strictEqual(sName, "pagination", "Pagination-Model wird angefragt");
            return {
                getProperty: function () {
                    return 2; // totalPages
                }
            };
        };

        oController.onNextPage();
        assert.strictEqual(oController._iCurrentPage, 2, "Seite wurde auf 2 erhöht");
        assert.strictEqual(iRefreshCalls, 1, "_refreshProductList wurde einmal aufgerufen");

        oController.onNextPage();
        assert.strictEqual(oController._iCurrentPage, 2, "Seite bleibt bei der letzten Seite stehen");
        assert.strictEqual(iRefreshCalls, 1, "_refreshProductList wird bei letzter Seite nicht erneut aufgerufen");
    });

    QUnit.test("_buildManufacturerModel liefert eine sortierte, eindeutige Herstellerliste mit Platzhalter an erster Stelle", function (assert) {
        var oController = new ProductOverviewController();
        var oSetModelCall = null;

        oController.setModel = function (oModel, sName) {
            oSetModelCall = { model: oModel, name: sName };
        };

        // _buildManufacturerModel ruft jetzt this.getResourceBundle().getText(...)
        // für den Platzhalter auf - ohne diesen Stub würde getOwnerComponent()
        // fehlschlagen, da der Controller in diesem Test an keiner Component hängt.
        oController.getResourceBundle = function () {
            return {
                getText: function (sKey) {
                    return sKey === "filterAllManufacturers" ? "Alle Hersteller" : sKey;
                }
            };
        };

        var aProducts = [
            { Manufacturer: "Faber-Castell" },
            { Manufacturer: "Pelikan" },
            { Manufacturer: "Faber-Castell" },
            { Manufacturer: "Edding" }
        ];

        oController._buildManufacturerModel(aProducts);

        var aItems = oSetModelCall.model.getData().Manufacturers;
        assert.strictEqual(oSetModelCall.name, "manufacturers", "Model wird unter 'manufacturers' gesetzt");
        assert.strictEqual(aItems[0].Key, "", "Erster Eintrag ist der Platzhalter 'Alle Hersteller'");
        assert.strictEqual(aItems[0].Text, "Alle Hersteller", "Platzhaltertext kommt über i18n (filterAllManufacturers), nicht hartkodiert");
        assert.deepEqual(
            aItems.slice(1).map(function (o) { return o.Text; }),
            ["Edding", "Faber-Castell", "Pelikan"],
            "Hersteller erscheinen sortiert und ohne Duplikate"
        );
    });
});