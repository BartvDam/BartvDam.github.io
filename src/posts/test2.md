---
title: Welcome to the blog
date: 2026-01-15
description: How this blog works and how to add new posts.
tags: [Microscopy]
---

This is the first post, and also the template for every post after it.

To add a new post: create a new markdown file anywhere in `src/posts/`,
give it a `title` and `date` in the front matter like this one has, and
write the post body below the `---` in regular markdown. Eleventy picks it
up automatically on the next build — no need to touch any other file, and
no need to link it in manually; it's added to `/blog/` and sorted by date
for you.

The filename becomes the URL slug, so `welcome-to-the-blog.md` becomes
`/blog/welcome-to-the-blog/`.
