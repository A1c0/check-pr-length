current_version=$(node -e "console.log(require('./package.json').version)")
git fetch
git checkout main
main_version=$(node -e "console.log(require('./package.json').version)")
echo main: "$main_version"
echo current: "$current_version"
if [ "$main_version" = "$current_version" ]
then
      echo "You forgot to change the version"
      exit 1
else
      echo "Done"
      exit 0
fi
