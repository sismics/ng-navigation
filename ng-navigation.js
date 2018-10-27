'use strict';

angular
    .module('ngNavigation', ['ui.router'])
    .provider('Navigation', function() {
        this.module = [];
        var moduleById = {};

        this.$get = function() {
            var module = this.module;
            return {
                getModule: function() {
                    return module;
                },
                getModuleById: function() {
                    return moduleById;
                }
            }
        };


        var addParent = function(parent, module) {
            module.parent = parent && parent.id;
            moduleById[module.id] = module;
            _.map(module.modules, function(e) {
                addParent(module, e);
            })

        };

        /**
         * Set the modules of the application.
         *
         * @param module The modules to set
         */
        this.setModule = function(module) {
            this.module = module;
            _.map(this.module, function(e) {
                addParent(null, e);
            });
        }
    })
    .service('ContextMenu', function() {
        return {
            listOperation: function(prefix, rights, $state, $stateParams, $scope) {
                return [{
                    id: prefix + '.create',
                    read: rights.create
                }];
            },
            createOperation : function(prefix) {
                return [{
                    id: prefix + '.list'
                }]
            },
            viewOperation : function(prefix, rights, $state, $stateParams, $scope) {
                return [{
                    id: prefix + '.list'
                }, {
                    id: prefix + '.create',
                    read: rights.create
                }, {
                    link: function() {
                        $state.go(prefix + '.edit', { id: $stateParams.id });
                    },
                    label: $state.get(prefix + '.edit').data.label,
                    read: rights.update
                }, {
                    link: function() {
                        return $scope.deleteItem({ id: $stateParams.id })
                    },
                    label: 'menu_delete',
                    read: rights.delete
                }]
            },
            editOperation: function(prefix, rights, $state, $stateParams, $scope) {
                return [{
                    id: prefix + '.list'
                }, {
                    id: prefix + '.create',
                    read: rights.create
                }, {
                    link: function() {
                        $state.go(prefix + '.view', { id: $stateParams.id });
                    },
                    label: $state.get(prefix + '.view').data.label
                }];

            }
        }
    })
    .directive('navMainbar', function () {
        return {
            restrict: 'E',
            templateUrl: 'vendor/@sismics/ng-navigation/partial/nav-mainbar.html'
        };
    })
    .directive('navOperation', function () {
        return {
            restrict: 'E',
            templateUrl: 'vendor/@sismics/ng-navigation/partial/nav-operation.html'
        };
    })
    .directive('navBreadcrumb', function() {
        return {
            templateUrl: 'vendor/@sismics/ng-navigation/partial/nav-breadcrumb.html'
        };
    })
    .directive('navProfile', function() {
        return {
            templateUrl: 'vendor/@sismics/ng-navigation/partial/nav-profile.html'
        }
    })
    .directive('navQuickInfo', function() {
        return {
            templateUrl: 'vendor/@sismics/ng-navigation/partial/nav-quick-info.html'
        }
    })
    .controller('Navigation', function($scope, $rootScope, $state, Navigation) {
        /**
         * Get the set of all read rights for the submodules of this module.
         *
         * @param module Module to check
         * @return Set of rights
         */
        var submoduleRead = function(module) {
            return _(module.modules)
                .thru(function(coll) {
                    return _.union(coll, _.map(coll, 'modules'));
                })
                .flatten()
                .map('read')
                .flatten()
                .compact()
                .value();
        };

        $scope.modules = _.map(Navigation.getModule(), function(module) {
            module.read = submoduleRead(module);
            return module;
        });

        /**
         * Return a map of all opened modules.
         *
         * @returns {{}}
         */
        var getInitModule = function() {
            var openModules = {};
            var navigationId = $state.current.data.navigationId;
            var module = Navigation.getModuleById()[navigationId];
            while (module != null) {
                openModules[navigationId] = true;
                navigationId = module.parent;
                module = Navigation.getModuleById()[navigationId];
            }
            return openModules;
        };

        var openModules = getInitModule();

        $scope.isModuleOpen = function(module) {
            return openModules[module];
        };

        $scope.openModule = function(module) {
            openModules[module] = !openModules[module];
        };
        
        /**
         * Returns true if this module is active (via the router state), or if one of its submodules is active.
         *
         * @param module Module to check
         * @returns {boolean}
         */
        $scope.isActive = function(module) {
            // Check if the current ID is specified in the routes definitions
            var navigationId = $state.current.data.navigationId;
            if (navigationId == module.id) {
                return true;
            }

            if (_(module.modules).find(function(submodule) {
                return $scope.isActive(submodule);
            }) != null) {
                return true;
            }
            return false;
        };

        $scope.moduleHref = function(module) {
            return module.submodules != null ? '' : $state.href(module.id);
        };

        $rootScope.menuShown = false;
        $rootScope.$on('$stateChangeSuccess', function () {
            $rootScope.menuShown = false;
        });
    });