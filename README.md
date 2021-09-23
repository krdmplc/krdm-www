[![Netlify Status](https://api.netlify.com/api/v1/badges/75126d26-6924-4999-a194-9e75a3d94f49/deploy-status)](https://app.netlify.com/sites/krdm-www/deploys)

# krdm.si

Website for Društvo KRDM

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Netlify Large Media

For contributions that don’t have access to repository’s Large Media files, you can use `GIT_LFS_SKIP_SMUDGE=1` with your clone command to ignore LFS settings and download the text pointer files only:

```sh
GIT_LFS_SKIP_SMUDGE=1 git clone YOUR_REPOSITORY_URL
```

**Windows users**: PowerShell and the Windows command line (cmd.exe) do not support the above syntax. For Windows users, I recommend running the command above using [Git Bash for Windows](https://git-scm.com/).

[Netlify docs about this](https://docs.netlify.com/large-media/repository-collaboration/)

### Installing

You need Hugo installed on your machine: <https://gohugo.io/getting-started/quick-start/>

This repository is set up to be developed with [Visual Studio Code](https://code.visualstudio.com/) editor. Please install reccommended extensions listed in <.vscode/extensions.json>

If this is your first time running the project, run

`npm install`

When you have that, just run

`hugo server` or `npm run dev`

and open your local site on <http://localhost:1313/>

## Development

We use [BEM](http://getbem.com/) naming convention for CSS class names.

We follow standard Javascript style.

### Linters

There are 3 linters set up: [stylelint](https://stylelint.io/) for CSS, [eslint](https://eslint.org/) for JS and [htmlhint](https://htmlhint.com/) for HTML. If quick fixes are possible, VS Code will fix them on save.

## Deployment

To deploy to production, push to `master` branch

### Development URL

There is no development URL out of the box. To create this environment, follow these steps:

1. create branch `develop`
2. Go to Netlify dashboard -> this site -> Settings -> Build & deploy -> Deploy contexts -> Edit settings
3. Under Branch deploys select Let me add individual branches and add `develop`
4. push some code to `develop` branch and see it on <https://develop--poslo-www.netlify.app>

## Built With

* [Hugo](https://gohugo.io/)
* [Netlify CMS](https://www.netlifycms.org/)
* [Netlify](https://www.netlify.com)
