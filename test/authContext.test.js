import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// Bundle JSX without starting a browser or contacting the authentication server.
const { outputFiles } = await build({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { MemoryRouter, Routes, Route } from 'react-router-dom';
      import { AuthProvider } from './src/contexts/AuthContext.jsx';
      import { AuthContext } from './src/contexts/authContextValue.js';
      import { useAuth } from './src/hooks/useAuth.js';
      import ProtectedRoute from './src/components/ProtectedRoute.jsx';

      function Probe() {
        const { loading, user, signOut } = useAuth();
        return <span>{JSON.stringify({ loading, user, canSignOut: typeof signOut === 'function' })}</span>;
      }
      const routes = <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path='/dashboard' element={<span>Dashboard content</span>} />
          </Route>
          <Route path='/login' element={<span>Login form</span>} />
        </Routes>
      </MemoryRouter>;
      export const probeProvider = () => renderToStaticMarkup(<AuthProvider><Probe /></AuthProvider>);
      export const initializingRoute = () => renderToStaticMarkup(<AuthProvider>{routes}</AuthProvider>);
      export const authenticatedRoute = () => renderToStaticMarkup(
        <AuthContext.Provider value={{ user: { id: 'test-user' }, loading: false }}>{routes}</AuthContext.Provider>
      );
    `,
    resolveDir: process.cwd(),
    loader: 'jsx',
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
  plugins: [
    {
      name: 'mock-supabase',
      setup(builder) {
        builder.onResolve({ filter: /supabaseClient$/ }, () => ({
          path: 'supabase',
          namespace: 'mock',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
          contents: `export const supabaseUrl = 'https://example.supabase.co'; export const supabase = {};`,
          loader: 'js',
        }));
      },
    },
  ],
});
const fixture = { exports: {} };
new Function('module', 'exports', 'require', outputFiles[0].text)(
  fixture,
  fixture.exports,
  createRequire(import.meta.url)
);

test('provider dan useAuth membagikan sesi serta status loading yang sama', () => {
  const html = fixture.exports.probeProvider();
  assert.match(html, /&quot;loading&quot;:true/);
  assert.match(html, /&quot;user&quot;:null/);
  assert.match(html, /&quot;canSignOut&quot;:true/);
});

test('dashboard menunggu inisialisasi provider sebelum memutuskan redirect login', () => {
  const html = fixture.exports.initializingRoute();
  assert.match(html, /animate-spin/);
  assert.doesNotMatch(html, /Dashboard content/);
});

test('dashboard terbuka ketika context yang sama memiliki sesi valid', () => {
  assert.match(fixture.exports.authenticatedRoute(), /Dashboard content/);
});
