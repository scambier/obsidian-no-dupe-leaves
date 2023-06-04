import {
  MarkdownView,
  OpenViewState,
  PaneType,
  Plugin,
  Workspace,
  getLinkpath,
} from 'obsidian'
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
          // Check all open panes for a matching path
          app.workspace.iterateAllLeaves(leaf => {
            const viewState = leaf.getViewState()
            if (
              viewState.type === 'markdown' &&
              viewState.state?.file === parts.path
            ) {
              // Found a corresponding pane
              app.workspace.setActiveLeaf(leaf, { focus: true })
              result = true
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
          scrollToPosition(parts)
          return result
        }
      },
    })
  }

  onunload(): void {
    uninstallPatchOpen()
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

  return {
    path: app.metadataCache.getFirstLinkpathDest(
      getLinkpath(path),
      app.workspace.getActiveFile()?.path
    ).path,
    heading,
    block,
  }
}
