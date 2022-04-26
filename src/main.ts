import { OpenViewState, Plugin, Workspace } from 'obsidian'
import { around } from 'monkey-around'

let uninstallPatchOpen: () => void

export default class NoDupeLeavesPlugin extends Plugin {
  async onload(): Promise<void> {
    // Monkey-patch Obsidian
    uninstallPatchOpen = around(Workspace.prototype, {
      openLinkText(oldOpenLinkText) {
        return function (
          linktext: string,
          sourcePath: string,
          newLeaf?: boolean,
          openViewState?: OpenViewState,
        ) {
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
          const name = linktext + linktext.endsWith('.md') ? '' : '.md'
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
