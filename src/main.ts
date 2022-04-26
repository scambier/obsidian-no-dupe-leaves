import { Plugin, Workspace } from 'obsidian'
import { around } from 'monkey-around'

let uninstallPatchOpen: () => void

export default class AutoUpdatedDatePlugin extends Plugin {
  async onload(): Promise<void> {
    // Monkey-patch Obsidian
    uninstallPatchOpen = around(Workspace.prototype, {
      openLinkText(oldOpenLinkText) {
        return function (...args) {
          const name = args[0] + '.md'
          let result
          app.workspace.iterateAllLeaves(leaf => {
            const viewState = leaf.getViewState()
            if (
              viewState.type === 'markdown' &&
              viewState.state?.file?.endsWith(name)
            ) {
              result = app.workspace.setActiveLeaf(leaf)
            }
          })
          if (!result) {
            result = oldOpenLinkText && oldOpenLinkText.apply(this, args)
          }
          return result
        }
      },
    })
  }

  onunload(): void {
    uninstallPatchOpen()
  }
}
