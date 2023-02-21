import { MarkdownView, OpenViewState, Plugin, Workspace } from 'obsidian'
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
          const sanitizedPath = sanitizePath(linktext)

          let result = false
          // Check all open panes for a matching path
          app.workspace.iterateAllLeaves(leaf => {
            const viewState = leaf.getViewState()
            if (
              viewState.type === 'markdown' &&
              viewState.state?.file?.endsWith(sanitizedPath.name)
            ) {
              // Found a corresponding pane
              app.workspace.setActiveLeaf(leaf)
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
          scrollToPosition(sanitizedPath)
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
  name: string
  heading?: string
  block?: string
}) {
  const cache = app.metadataCache.getCache(sanitizedPath.name)
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

function sanitizePath(path: string): {
  name: string
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
  const name = path + (path.endsWith('.md') ? '' : '.md')
  return { name, heading, block }
}
