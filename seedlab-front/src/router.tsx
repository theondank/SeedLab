import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import NotFound from './not-found'

export const routes: RouteObject[] = [
  {
    errorElement: <NotFound />,
    children: [
      {
        path: '/',
        lazy: async () => {
          const { default: LoginPage } = await import('./login/login-page')
          return { Component: LoginPage }
        },
      },
      {
        path: '/dashboard',
        lazy: async () => {
          const { default: Dashboard } = await import('./Dashboard/dashome')
          return { Component: Dashboard }
        },
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Home } = await import('./Dashboard/home')
              return { Component: Home }
            },
          },
          {
            path: 'plantes',
            lazy: async () => {
              const { default: Plants } = await import('./Dashboard/plantes')
              return { Component: Plants }
            },
          },
          {
            path: 'parametres',
            lazy: async () => {
              const { default: Parameters } = await import('./Dashboard/parametres')
              return { Component: Parameters }
            },
          },
          {
            path: 'capteurs',
            lazy: async () => {
              const { default: Sensors } = await import('./Dashboard/sensor')
              return { Component: Sensors }
            },
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
