import { OpenViewState, Plugin, Workspace } from 'obsidian'
import { around } from 'monkey-around'

let uninstallPatchOpen: () => void

export default class NoDupeLeavesPlugin extends Plugin {
  async onload(): Promise<void> {
    uninstallPatchOpen = around(Workspace.prototype, {
      
      
      // Monkey-patch the OpenLinkText function
      openLinkText(oldOpenLinkText) {
        return function (
          linktext: string,
          sourcePath: string,
          newLeaf?: boolean,
          openViewState?: OpenViewState,
        ) {
          // If the `newLeaf` parameter is true, respect the default behavior and exit here
          if (newLeaf) {
            return (
              oldOpenLinkText &&
              oldOpenLinkText.apply(this, [
                linktext,
                sourcePath,
                newLeaf,
                openViewState,
              ])
            )
          }
          // Make sure that the path ends with '.md'
          const name = linktext + (linktext.endsWith('.md') ? '' : '.md')
          let result
          // Check all open panes for a matching path
          app.workspace.iterateAllLeaves(leaf => {
            const viewState = leaf.getViewState()
            if (
              viewState.type === 'markdown' &&
              viewState.state?.file?.endsWith(name)
            ) {
              // Found a corresponding pane
              result = app.workspace.setActiveLeaf(leaf)
            }
          })
          // If no pane matches the path, call the original function
          if (!result) {
            result =
              oldOpenLinkText &&
              oldOpenLinkText.apply(this, [
                linktext,
                sourcePath,
                newLeaf,
                openViewState,
              ])
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
