"use strict";

Application.controller("costManagementController", function ($scope, $http, dateFactory) {
    this.isOpen = false;

    $scope.disableDescription = true;
    $scope.editedRows = [];
    $scope.editedRowsIds = [];
    $scope.addedRows = [];
    $scope.selectedRowId = '';
    $scope.costs = [];

    $scope.newTypeValue = "";
    $scope.buyerNames = [];
    $scope.selectedBuyerNames = [];
    $scope.selectedBuyerName = "";
    $scope.rowIdForNewType = "";

    $scope.types = [];
    $scope.selectedTypes = [];

    $scope.selectedSize = 50;

    $scope.dpFromDate = moment().subtract(6, "days").toDate();
    $scope.dpToDate = new Date();

    $scope.hideBuyerSelect = false;
    $scope.showCostManagementLoader = false;
    $scope.searchFilter = "";

    $scope.tableSpent = "";

    $scope.selectedPage = 1;
    $scope.totalPagination = 1;
    $scope.noOfPages = 1;
    $scope.role = "";
    $scope.disableCreateCost = false;

    $scope.dt = {
        startDate: $scope.dpFromDate,
        endDate: $scope.dpToDate
    };

    $scope.dpOptions = {
        locale: {
            applyClass: "btn-green",
            applyLabel: "Apply",
            fromLabel: "From",
            format: "DD-MM-YYYY",
            toLabel: "To",
            cancelLabel: 'Cancel',
            customRangeLabel: 'Custom range'
        },
        ranges: {
            "Today": [moment().subtract(1, "days"), moment()],
            "Yesterday": [moment().subtract(2, "days"), moment()],
            "Last 7 Days": [moment().subtract(6, "days"), moment()],
            "Last 30 Days": [moment().subtract(29, "days"), moment()]
        }
    };

    //functions
    $scope.getRole = function () {
        var request = new XMLHttpRequest();
        request.open('GET', '/user/me', false);  // `false` makes the request synchronous
        request.send(null);

        if (request.status === 200) {
            var z = JSON.parse(request.response);
            $scope.role = z.authorities[0].authority;
        }
    };

    $scope.initRole = function () {
        $scope.getRole();
        if ($scope.role === "BUYER") {
            $scope.hideBuyerSelect = true;
            $scope.disableCreateCost = true;
        }
    };


    $scope.loadCosts = function () {
        $scope.costs = [];
        $scope.showCostManagementLoader = true;

        var url = "/expenses?buyerIds=" + $scope.getFilterDetails();

        $http.post(url, $scope.getSizeAndNumberFilter())
            .then(function successCallback(response) {
                $scope.costs = response.data.data;
                for (var i = 0; i < $scope.costs.length; i++) {
                    $scope.costs[i].create = new Date($scope.costs[i].dateCreate).toLocaleDateString();
                    $scope.costs[i].update = new Date($scope.costs[i].dateChange).toLocaleDateString();
                    for (var j = 0; j < $scope.buyerNames.length; j++) {
                        if ($scope.costs[i].buyerId === $scope.buyerNames[j].id) {
                            $scope.costs[i].buyer = $scope.buyerNames[j].name;
                        }
                    }
                }
                $scope.showCostManagementLoader = false;
                $scope.totalPagination = response.data.size;
                $scope.noOfPages = Math.ceil($scope.totalPagination / $scope.selectedSize);
            }, function errorCallback(response) {
                $scope.showCostManagementLoader = false;
                notify('ti-alert', 'Error occurred during loading postbacks', 'danger');
            });
    };

    $scope.formatFromToDate = function () {
        $scope.dpFromDate = formatDate($scope.dt.startDate._d);
        $scope.dpToDate = formatDate($scope.dt.endDate._d);
    };

    $scope.onApplyClick = function () {
        $scope.formatFromToDate();
        $scope.findAddedRows();
        $scope.findEditedRows();
        $scope.matchEditedTypesAndBuyers();

        if ($scope.addedRows.length !== 0) {
            var saveUrl = "/expenses/save";
            $http.post(saveUrl, $scope.addedRows).then(function success() {
                $scope.loadCosts();
                notify('ti-alert', 'Saving successful', 'success');
            }, function errorCallback(response) {
                $scope.showCostManagementLoader = false;
                notify('ti-alert', 'Error occurred during saving costs', 'danger');
            });
        }

        if ($scope.editedRows.length !== 0) {
            var putUrl = "/expenses";
            $http.put(putUrl, $scope.editedRows).then(function success() {
                $scope.loadCosts();
                notify('ti-alert', 'Editing successful', 'success');
            }, function errorCallback(response) {
                $scope.showCostManagementLoader = false;
                notify('ti-alert', 'Error occurred during editing costs', 'danger');
            });
        }

        $scope.addedRows = [];
        $scope.editedRows = [];
        $scope.editedRowsIds = [];
        $scope.disableDescription = true;
        $scope.loadCosts();
    };

    $scope.addCost = function () {
        $scope.disableDescription = false;
        $scope.costs.unshift({
            buyer: null, buyerId: null, create: null,
            date: formatDate(new Date()), description: null,
            id: null, name: null, sum: null, typeId: null, update: null
        });
    };


    $scope.getFilterDetails = function () {
        var fromDate = formatDate($scope.dpFromDate);
        var toDate = formatDate($scope.dpToDate);
        return $scope.selectedBuyerNames + "&expensesType=" + $scope.selectedTypes + "&from=" + fromDate + "&to=" + toDate;
    };

    $scope.getSizeAndNumberFilter = function () {
        var parameters = {};
        parameters.size = $scope.selectedSize;
        parameters.number = $scope.selectedPage;

        return parameters;
    };


    $scope.getBuyers = function () {
        var url = "/buyer";
        $http.get(url).then(function success(response) {
            $scope.buyerNames = response.data;
        }, function fail(response) {
            notify('ti-alert', 'Error occurred during loading buyers', 'danger');
        });
    };


    $scope.getTypes = function () {
        var url = "expenses/type/all";
        $http.get(url).then(function success(response) {
            $scope.types = response.data;
        }, function fail(response) {
            notify('ti-alert', 'Error occurred during loading types', 'danger');
        });
    };

    $scope.findAddedRows = function () {
        for (var i = 0; i < $scope.costs.length; i++) {
            if ($scope.costs[i].id === null) {
                for (var j = 0; j < $scope.buyerNames.length; j++) {
                    if ($scope.buyerNames[j].name === $scope.costs[i].buyer) {
                        $scope.costs[i].buyerId = $scope.buyerNames[j].id;
                    }
                }

                for (var f = 0; f < $scope.types.length; f++) {
                    if ($scope.types[f].name === $scope.costs[i].name) {
                        $scope.costs[i].typeId = $scope.types[f].id;
                    }
                }
                $scope.addedRows.push($scope.costs[i]);
            }
        }

        for (var e = 0; e < $scope.addedRows.length; e++) {
            $scope.addedRows[e].date = formatDate($scope.addedRows[e].date);
        }
    };

    $scope.findEditedRows = function () {
        if ($scope.editedRowsIds.length !== 0) {
            for (var i = 0; i < $scope.costs.length; i++) {
                if ($scope.costs[i].id !== null) {
                    for (var j = 0; j < $scope.editedRowsIds.length; j++) {
                        if ($scope.costs[i].id === $scope.editedRowsIds[j]) {
                            $scope.editedRows.push($scope.costs[i]);
                        }
                    }
                }
            }

            for (var e = 0; e < $scope.editedRows.length; e++) {
                $scope.editedRows[e].date = formatDate($scope.editedRows[e].date);
            }
        }
    };


    $scope.matchEditedTypesAndBuyers = function () {
        for (var i = 0; i < $scope.costs.length; i++) {
            for (var j = 0; j < $scope.buyerNames.length; j++) {
                if ($scope.costs[i].buyer === $scope.buyerNames[j].name) {
                    $scope.costs[i].buyerId = $scope.buyerNames[j].id;
                }
            }

            for (var f = 0; f < $scope.types.length; f++) {
                if ($scope.costs[i].name === $scope.types[f].name) {
                    $scope.costs[i].typeId = $scope.types[f].id;
                }
            }

        }
    };

    $scope.addType = function () {
        var val = $scope.newTypeValue;
        if (val !== "") {
            var typeSaveUrl = "/expenses/type/save?name=" + val;
            $http.post(typeSaveUrl, val).then(function success() {
                $scope.getTypes();

                for (var i = 0; i < $scope.costs.length; i++) {
                    if ($scope.costs[i].id === $scope.rowIdForNewType) {
                        $scope.costs[i].name = val;

                        for (var j = 0; j < $scope.types.length; j++) {
                            if (val === $scope.types[j].name) {
                                $scope.costs[i].typeId = $scope.types[j].id;
                            }
                        }
                    }
                }


            }, function errorCallback(response) {
                notify('ti-alert', 'Error occurred during saving types', 'danger');
            });
        }
    };


    $scope.selectRow = function (id) {
        $scope.selectedRowId = id;
    };

    $scope.deleteRow = function () {
        for (var i = 0; i < $scope.costs.length; i++) {
            if ($scope.selectedRowId === $scope.costs[i].id) {
                $scope.costs.splice(i, 1);
            }
        }

        var deleteUrl = "/expenses?expensesIds=" + $scope.selectedRowId;
        $http.delete(deleteUrl).then(function success() {
            notify('ti-alert', 'Deleted successful', 'success');
        }, function errorCallback(response) {
            $scope.showCostManagementLoader = false;
            notify('ti-alert', 'Error occurred during deleting costs', 'danger');
        });
    };


    $scope.updateBuyerName = function (id) {
        if ($scope.editedRowsIds.length === 0) {
            $scope.editedRowsIds.push(id);
        }
        else {
            for (var i = 0; i < $scope.editedRowsIds.length; i++) {
                if ($scope.editedRowsIds[i] !== id) {
                    $scope.editedRowsIds.push(id);
                }
            }
        }
    };

    $scope.updateDate = function (id) {
        if ($scope.editedRowsIds.length === 0) {
            $scope.editedRowsIds.push(id);
        }
        else {
            for (var i = 0; i < $scope.editedRowsIds.length; i++) {
                if ($scope.editedRowsIds[i] !== id) {
                    $scope.editedRowsIds.push(id);
                }
            }
        }
    };

    $scope.updateSum = function (id) {
        if ($scope.editedRowsIds.length === 0) {
            $scope.editedRowsIds.push(id);
        }
        else {
            for (var i = 0; i < $scope.editedRowsIds.length; i++) {
                if ($scope.editedRowsIds[i] !== id) {
                    $scope.editedRowsIds.push(id);
                }
            }
        }
    };

    $scope.updateType = function (id) {
        if ($scope.editedRowsIds.length === 0) {
            $scope.editedRowsIds.push(id);
        }
        else {
            for (var i = 0; i < $scope.editedRowsIds.length; i++) {
                if ($scope.editedRowsIds[i] !== id) {
                    $scope.editedRowsIds.push(id);
                }
            }
        }
    };

    $scope.clickAddNewType = function (id) {
        $scope.rowIdForNewType = id;
    };
});

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}


Application.directive('resize', function ($window) {
    return function (scope, element) {
        var w = angular.element($window);
        scope.getWindowDimensions = function () {
            return {'h': w.height()};
        };
        scope.$watch(scope.getWindowDimensions, function (newValue, oldValue) {
            scope.windowHeight = newValue.h;

            scope.style = function () {
                return {
                    'min-height': (newValue.h + 50) + 'px'
                };
            };

        }, true);

        w.bind('resize', function () {
            scope.$apply();
        });
    }
});


