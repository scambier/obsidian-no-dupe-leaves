import {
  MarkdownView,
  OpenViewState,
  PaneType,
  Plugin,
  TFile,
  Workspace,
  WorkspaceLeaf,
  getLinkpath,
} from 'obsidian'
import { around } from 'monkey-around'

let uninstallPatchOpen: () => void
let uninstallPatchOpenFile: () => void

export default class NoDupeLeavesPlugin extends Plugin {
  async onload(): Promise<void> {
    uninstallPatchOpen = around(Workspace.prototype, {
      // Monkey-patch the OpenLinkText function
      openLinkText(oldOpenLinkText) {
        return function (
          linktext: string,
          sourcePath: string,
          newLeaf?: PaneType | boolean,
          openViewState?: OpenViewState
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

          // Gets the path and heading/block from the linktext
          const parts = getLinkParts(linktext)

          let result = false
          let foundLeaf: WorkspaceLeaf | null = null
          let foundPinnedLeaf: WorkspaceLeaf | null = null

          // Check all open panes for a matching path, prioritizing pinned tabs
          app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
            const viewState = leaf.getViewState()
            if (
              viewState.type === 'markdown' &&
              viewState.state?.file === parts.path
            ) {
              if (!foundLeaf) {
                foundLeaf = leaf
              }
              if ((leaf as any).pinned && !foundPinnedLeaf) {
                foundPinnedLeaf = leaf
              }
            }
          })

          // Navigate to pinned tab if found, otherwise use first match
          const targetLeaf = foundPinnedLeaf || foundLeaf
          if (targetLeaf) {
            app.workspace.setActiveLeaf(targetLeaf, { focus: true })
            result = true
          }
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
          scrollToPosition(parts)
          return result
        }
      },
    })

    // Patch WorkspaceLeaf.prototype.openFile for direct file opens
    uninstallPatchOpenFile = around(WorkspaceLeaf.prototype, {
      openFile(oldOpenFile) {
        return async function (file: TFile, openState?: OpenViewState) {
          let foundLeaf: WorkspaceLeaf | null = null
          let foundPinnedLeaf: WorkspaceLeaf | null = null

          app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
            // Skip the current leaf
            if (leaf === this) return

            const viewState = leaf.getViewState()
            if (
              viewState.type === 'markdown' &&
              viewState.state?.file === file?.path
            ) {
              const isPinned = (leaf as any).pinned
              // Prioritize pinned tabs by checking them first
              if (isPinned) {
                if (!foundPinnedLeaf) {
                  foundPinnedLeaf = leaf
                }
              } else {
                if (!foundLeaf) {
                  foundLeaf = leaf
                }
              }
            }
          })

          const targetLeaf = foundPinnedLeaf || foundLeaf
          if (targetLeaf) {
            app.workspace.setActiveLeaf(targetLeaf, { focus: true })

            // Delay detach to let navigation complete first
            const currentLeaf = this as WorkspaceLeaf
            const currentViewState = currentLeaf.getViewState()
            if (!currentViewState.state?.file) {
              setTimeout(() => currentLeaf.detach(), 50)
            }

            return Promise.resolve()
          }

          return oldOpenFile && oldOpenFile.apply(this, [file, openState])
        }
      }
    })
  }

  onunload(): void {
    uninstallPatchOpen()
    uninstallPatchOpenFile()
  }
}

/**
 * Set the cursor to the heading/block
 * @param parts
 */
function scrollToPosition(parts: {
  path: string
  heading?: string
  block?: string
}) {
  const cache = app.metadataCache.getCache(parts.path)
  const view = app.workspace.getActiveViewOfType(MarkdownView)

  // Get the corresponding position for the heading/block
  if (parts.heading) {
    const heading = cache.headings.find(
      heading => heading.heading === parts.heading
    )
    if (heading) {
      view.editor.setCursor(heading.position.start.line)
    }
  } else if (parts.block) {
    const block = cache.blocks[parts.block]
    if (block) {
      view.editor.setCursor(block.position.start.line)
    }
  }
}

function getLinkParts(path: string): {
  path: string
  heading?: string
  block?: string
} {
  // Extract the #^block from the path
  const blockMatch = path.match(/\^(.*)$/)
  const block = blockMatch ? blockMatch[1] : undefined
  // Remove the #^block
  path = path.replace(/(\^.*)$/, '')

  // Extract the #heading from the path
  const headingMatch = path.match(/#(.*)$/)
  const heading = headingMatch ? headingMatch[1] : undefined
  // Remove the #heading
  path = path.replace(/(#.*)$/, '')

  let file: TFile | null
  try {
    file = app.metadataCache.getFirstLinkpathDest(
      getLinkpath(path),
      app.workspace.getActiveFile()?.path
    )
  } catch (e) {
    file = null
  }

  return {
    path: file?.path ?? path,
    heading,
    block,
  }
}
