import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LiveFeedComponent } from './live-feed/live-feed.component';
import { MazeComponent } from './maze/maze.component';


export const routes: Routes = [
    {
        path: '',
        redirectTo: '/feed',
        pathMatch: 'full'
    },
    { path: 'feed', component: LiveFeedComponent},
    { path: 'maze', component: MazeComponent}
];

export const routing: ModuleWithProviders = RouterModule.forRoot(routes, {useHash: true});