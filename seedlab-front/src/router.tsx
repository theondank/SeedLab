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
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
