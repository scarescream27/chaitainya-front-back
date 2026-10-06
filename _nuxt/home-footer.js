/**
 * ============================================================================
 * File: home-footer.js
 * Purpose: Home footer: the Shutter Glyph Footer (wordmark + Contact Us form),
 * built by shutter-footer.js inside a single <footer> root.
 * ============================================================================
 */
import { E as onMounted, o as onBeforeUnmount, H as openBlock, F as createElementBlock } from "./vue-runtime.js";
import { mountShutterFooter } from "./shutter-footer.js";

const M = {
  __name: "homeFooter",
  setup() {
    let root = null;
    let handle = null;
    onMounted(() => {
      if (root) handle = mountShutterFooter(root);
    });
    onBeforeUnmount(() => {
      handle?.destroy();
      handle = null;
    });
    // Vue owns only the <footer>; its contents are built by mountShutterFooter.
    return () => (
      openBlock(),
      createElementBlock("footer", { class: "home-footer sgf", id: "contact", ref: (el) => (root = el) }, null, 512)
    );
  },
};

// home-scene-3d.js awaits this (the bundle's top-level-await convention).
const E = Promise.resolve();
export { M as H, E as __tla };
