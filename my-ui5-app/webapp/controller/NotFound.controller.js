sap.ui.define([
    "./BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("my.ui5.app.controller.NotFound", {

        /**
         * Die Seite zeigt nur einen statischen Hinweistext, es ist nichts aufzubauen
         */
        onInit: function () {
        }
    });
});
