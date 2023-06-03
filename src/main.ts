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

          // Make sure that the path ends with '.md'
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
 * @param sanitizedPath
 */
function scrollToPosition(sanitizedPath: {
  path: string
  heading?: string
  block?: string
}) {
  const cache = app.metadataCache.getCache(sanitizedPath.path)
  const view = app.workspace.getActiveViewOfType(MarkdownView)

  // Get the corresponding position for the heading/block
  if (sanitizedPath.heading) {
    const heading = cache.headings.find(
      heading => heading.heading === sanitizedPath.heading
    )
    if (heading) {
      view.editor.setCursor(heading.position.start.line)
    }
  } else if (sanitizedPath.block) {
    const block = cache.blocks[sanitizedPath.block]
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

  // Make sure that the path ends with '.md'
  return {
    path: app.metadataCache.getFirstLinkpathDest(
      getLinkpath(path),
      app.workspace.getActiveFile()?.path
    ).path,
    heading,
    block,
  }
}
