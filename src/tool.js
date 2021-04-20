const fs = require("fs");
const path = require("path");

const run = require("runscript");

// 获取所有的markdown文件，相对地址
const getMarkdownFiles = async (sourceDir) => {
  const { stdout } = await run("ls **/*.md", {
    cwd: sourceDir,
    stdio: "pipe",
  });
  const files = stdout.toString().split("\n");
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

        // 转成 https 协议，不然下载不了
        imageUrl: imageUrl.replace(/^http:\/\//g, "https://"),
      };
    }
  }
};

// 获取图片的文件名
const getImageFileName = (imageUrl) => {
  let url;
  try {
    url = new URL(imageUrl);
  } catch (err) {
    console.log("不保存", imageUrl, err.toString());
    return null;
  }
  const match = /^.*\/(.+?\.(?:png|jpg|jpeg|gif))(?:.*)$/.exec(url.pathname);
  if (match == null) {
    debugger;
  }
  const [, imageFileName] = match;
  return imageFileName;
};

module.exports = {
  getMarkdownFiles,
  imageUrlGen,
  getImageFileName,
};
