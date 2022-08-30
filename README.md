# Obsidian "No Dupe Leaves" Plugin

![Custom badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fscambier.xyz%2Fobsidian-endpoints%2Fno-dupe-leaves.json)

> Automatically switch the focus to open notes instead of reopening them

[The discussion that led to this plugin's creation](https://forum.obsidian.md/t/dont-reopen-notes-that-are-already-open-just-put-the-focus-on-them/36488/3).

Obsidian's default behavior is to replace the old note `A` with the new note `B` when you open it,
_even if `B` is already open in another pane_, leading you to have 2 instances of `B`.

This plugin will avoid opening duplicates when possible, while still respecting all "force open in a new pane" instructions (e.g. middle click on a link).

---

⚠️ **Word of warning** ⚠️ This plugin modifies the default behavior of Obsidian.

Internally, it overwrites the public function `openLinkText()`, which is called when you click on a link in a note. This also affects other plugins that use this funtion - like Omnisearch -, but does not work on core features like the File Explorer.

Add your input the the [original feature request](https://forum.obsidian.md/t/dont-reopen-notes-that-are-already-open-just-put-the-focus-on-them/36488/3) to tell Obsidian that you'd like this behavior as the default :)

---

![](https://raw.githubusercontent.com/scambier/obsidian-no-dupe-leaves/master/images/nodupes.gif)


## Contributing

As this is a quick hack over the default behavior, no feature request will be considered. You can submit PRs for bugfixes.
