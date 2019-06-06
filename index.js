const fs = require('fs');
const path = require('path');
const runScript = require('runscript');
const download = require('download');

const parallelRunPromise = require('./util/parallel-run-promise');

// 获取所有的markdown文件，相对地址
const getMarkdownFiles = async sourceDir => {
  const { stdout } = await runScript('ls **/*.md', {
    cwd: sourceDir,
    stdio: 'pipe',
  });
  const files = stdout.toString().split('\n');
  // 去掉尾部空行
  files.pop();

  return files;
};

// 获取所有的图片地址
const imageUrlGen = function* (sourceDir, files) {
  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    const content = fs.readFileSync(filePath);
    const [, dir] = /^(.+)\.md$/.exec(file);

    const imageRegExp = /!\[.*?\]\((.+?)\)/g;
    while (true) {
      const imageUrlMatch = imageRegExp.exec(content);
      if (imageUrlMatch == null) {
        break;
      }

      const [, imageUrl] = imageUrlMatch;
      yield {
        dir,
        imageUrl,
      };
    }
  }
};

// 获取图片的文件名
const getImageFileName = imageUrl => {
  let url;
  try {
    url = new URL(imageUrl);
  } catch (err) {
    console.log('不保存', imageUrl, err.toString());
    return null;
  }
  const [, imageFileName] = /^.*\/(.+?)$/.exec(url.pathname);
  return imageFileName;
};

// 入口函数
const main = async () => {
  const [, , sourceDir, targetDir] = process.argv;

  const files = await getMarkdownFiles(sourceDir);
  const imageUrls = [...imageUrlGen(sourceDir, files)];

  const lazyPromises = imageUrls.map(({ dir, imageUrl }) => async () => {
    const imageFileName = getImageFileName(imageUrl);

    // 对于不合法的图片地址，不保存
    if (imageFileName == null) {
      return;
    }

    // 确保文件夹存在
    const distDir = path.join(targetDir, dir);
    await runScript(`mkdir -p "${distDir}"`);

    // 下载
    const distFile = path.join(distDir, imageFileName);
    const buffer = await download(imageUrl);
    fs.writeFileSync(distFile, buffer);
  });

  // 限制并发数
  await parallelRunPromise(lazyPromises, 20);
};

main();
