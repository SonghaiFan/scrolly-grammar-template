import DefaultTheme from 'vitepress/theme';
import { defineAsyncComponent } from 'vue';
import './custom.css';
import '../../../dist/visdelta.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('SyntaxPlayground', defineAsyncComponent(
      () => import('../components/SyntaxPlayground.vue')
    ));
    app.component('TransitionWorkbench', defineAsyncComponent(
      () => import('../components/TransitionWorkbench.vue')
    ));
  }
};
