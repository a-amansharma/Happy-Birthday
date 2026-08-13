/* ============================================================
   APP — boot the little world
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB;

  function boot() {
    // Default route
    if (!location.hash) {
      history.replaceState(null, '', '#/' + (HB.state.onboarded ? 'home' : ''));
    }

    HB.boot();

    // Welcome micro-interaction
    if (!HB.state.onboarded) {
      setTimeout(function () {
        HB.toast('Welcome to your little world ♡', '🐻');
      }, 900);
    }

    // Resume ambient music after first interaction if it was on
    if (HB.state.onboarded && HB.state.settings.music && !HB.music.isOn()) {
      var resume = function () {
        document.removeEventListener('pointerdown', resume);
        document.removeEventListener('keydown', resume);
        HB.music.toggle();
      };
      document.addEventListener('pointerdown', resume);
      document.addEventListener('keydown', resume);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
