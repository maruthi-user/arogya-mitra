export function initialScreen(settings) {
  return 'roles';
}
export function createRouter(state, beforeNavigate, onNavigate) {
  return {
    go(screen, params = {}) {
      beforeNavigate();
      if (screen !== state.screen) state.stack.push({screen:state.screen, params:state.params});
      state.screen=screen; state.params=params; onNavigate();
    },
    goBack() {
      beforeNavigate(); const previous=state.stack.pop();
      if (previous) {Object.assign(state,previous);onNavigate();}
    },
    resetTo(screen) {
      beforeNavigate();state.stack=[];state.screen=screen;state.params={};onNavigate();
    }
  };
}
