'use strict';

angular.module('mean.icu.ui.projectdetails', [])
    .controller('ProjectDetailsController', function ($scope,
                                                      entity,
                                                      tasks,
                                                      people,
                                                      projects,
                                                      context,
                                                      $state,
                                                      ProjectsService,
                                                      ActivitiesService,
                                                      $stateParams) {
        if (($state.$current.url.source.includes("search")) || ($state.$current.url.source.includes("projects")))
        {
            $scope.project = entity || context.entity;
        }
        else
        {
            $scope.project = context.entity || entity;
        }
        $scope.tasks = tasks.data || tasks;
        $scope.projects = projects.data || projects;
        $scope.shouldAutofocus = !$stateParams.nameFocused;

        ProjectsService.getStarred().then(function (starred) {

            // Chack if HI room created and so needs to show HI.png
            if($scope.project.WantRoom == true)
            {
                $('#HI').css('background-image', 'url(/icu/assets/img/Hi.png)');
            }

            $scope.project.star = _(starred).any(function (s) {
                return s._id === $scope.project._id;
            });
        });

        // backup for previous changes - for updates
        var backupEntity = JSON.parse(JSON.stringify($scope.project));

        if (!$scope.project) {
            $state.go('main.projects.byentity', {
                entity: context.entityName,
                entityId: context.entityId
            });
        }

        $scope.statuses = ['new', 'in-progress', 'canceled', 'completed', 'archived'];

        $scope.$watchGroup(['project.description', 'project.title'], function (nVal, oVal, scope) {
            if (nVal !== oVal && oVal) {
                var newContext;
                if (nVal[1] !== oVal[1]) {
                    newContext = {
                        name: 'title',
                        oldVal: oVal[1],
                        newVal: nVal[1],
                        action: 'renamed'
                    };
                } else {
                    newContext = {
                        name: 'description',
                        oldVal: oVal[0],
                        newVal: nVal[0]
                    };
                }
                $scope.delayedUpdate($scope.project, newContext);
            }
        });

        $scope.$watch('project.color', function (nVal, oVal) {
            if (nVal !== oVal) {
                var context = {
                    name: 'color',
                    oldVal: oVal,
                    newVal: nVal,
                    action: 'changed'
                };
                $scope.update($scope.project, context);
            }
        });

        $scope.people = people.data || people;

        $scope.options = {
            theme: 'bootstrap',
            buttons: ['bold', 'italic', 'underline', 'anchor', 'quote', 'orderedlist', 'unorderedlist']
        };

        $scope.dueOptions = {
            onSelect: function () {
                $scope.update($scope.project, 'due');
            },
            dateFormat: 'd.m.yy'
        };

        function navigateToDetails(project) {
            $scope.detailsState = context.entityName === 'all' ?
                'main.projects.all.details' : 'main.projects.byentity.details';

            $state.go($scope.detailsState, {
                id: project._id,
                entity: $scope.currentContext.entityName,
                entityId: $scope.currentContext.entityId,
                starred: $stateParams.starred
            }, {reload: true});
        }

        $scope.star = function (project) {
            ProjectsService.star(project).then(function () {
                navigateToDetails(project);
            });
        };

        $scope.WantToCreateRoom = function (project) {

            if($scope.project.WantRoom == false)
            {
                $('#HI').css('background-image', 'url(/icu/assets/img/Hi.png)');

                project.WantRoom = true;

                $scope.update(project, context);

                ProjectsService.WantToCreateRoom(project).then(function () {
                    navigateToDetails(project);
                });
            }
        };

        $scope.deleteProject = function (project) {
            ProjectsService.remove(project._id).then(function () {

                $state.go('main.projects.all', {
                    entity: 'all'
                }, {reload: true});
            });
        };

        var reloadCurrent = function() {
            $state.go($state.current.name, {
                entity: context.entityName,
                entityId: context.entityId
            }, {reload: true});
        }            

        $scope.update = function (project, context) {
            ProjectsService.update(project, context).then(function(res) {
                if (ProjectsService.selected && res._id === ProjectsService.selected._id) {
                    if (context.name === 'title') {
                        ProjectsService.selected.title = res.title;
                    }
                    if (context.name === 'color') {
                        ProjectsService.selected.color = res.color;
                    }
                }
                switch (context.name) {
                    case 'status':
                        if (context.entityName === 'discussion') {
                            project.discussion = context.entityId;
                        }

                        ProjectsService.updateStatus(project, backupEntity).then(function(result) {
                            backupEntity = JSON.parse(JSON.stringify($scope.project));
                            ActivitiesService.data = ActivitiesService.data || [] ;
                            ActivitiesService.data.push(result);
                            reloadCurrent();
                        });
                        break;
                
                    case 'color':
                        ProjectsService.updateColor(project).then(function(result) {
                            ActivitiesService.data = ActivitiesService.data || [] ; // TBD
                            ActivitiesService.data.push(result);
                            reloadCurrent();
                        });
                        break;   
                }
            });
        };

        $scope.updateCurrentProject = function(){
            $scope.project.PartTitle = $scope.project.title;
            ProjectsService.currentProjectName = $scope.project.title;
        }

        $scope.delayedUpdate = _.debounce($scope.update, 500);

        if ($scope.project &&
            ($state.current.name === 'main.projects.all.details' ||
            $state.current.name === 'main.search.project' ||
            $state.current.name === 'main.projects.byentity.details')) {
            $state.go('.activities');
        }
    });
