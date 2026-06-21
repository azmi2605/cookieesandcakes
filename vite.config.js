import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        about: resolve('about.html'),
        menu: resolve('menu.html'),
        gallery: resolve('gallery.html'),
        order: resolve('order.html'),
        admin: resolve('admin.html'),
        migrate: resolve('migrate.html'),
        login: resolve('login.html'),
        adminLogin: resolve('admin-login.html'),
        "404": resolve('404.html')
      }
    }
  }
});
