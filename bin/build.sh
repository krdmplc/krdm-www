#!/bin/bash

# Previews build their merch from, and send their forms to, the preview of KRDM
# band (its `main` Preview, on preview data), never the real app: orders and
# messages sent from a preview are test data. Set HUGO_PARAMS_BANDAPI to use
# another one (a krdm-band branch Preview, or http://localhost:5173).

if [[ "$CONTEXT" = "production" ]]
then
  echo ----- PRODUCTION
  sed -i.bak "s|__BRANCH__|${HEAD}|g" static/admin/config.yml && rm -f static/admin/config.yml.bak
  sh ./bin/with-dart-sass.sh hugo --gc --minify -b "$URL"
  status=$?
else
  echo +++++ PREVIEW
  export HUGO_PARAMS_BANDAPI="${HUGO_PARAMS_BANDAPI:-https://main-krdm-band.krdm.workers.dev}"
  sed -i.bak "s|__BRANCH__|${HEAD}|g" static/admin/config.yml && rm -f static/admin/config.yml.bak
  sh ./bin/with-dart-sass.sh hugo --gc -b "$DEPLOY_PRIME_URL"
  status=$?
fi
echo -------------------

if [ $status -eq 0 ]
then
  # npm run env
  echo "Build success ......"
else
  echo "Build failure ############# " >&2
fi

exit $status
