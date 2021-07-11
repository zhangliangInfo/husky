const fs = require('fs');
const path = require('path');
const { resolve } = require('path');
const execa = require('execa');
const cwd = process.cwd();
// 需要包含测试用例的文件
const includesDir = ['src/pages'];

interface CHECKRST {
  filename: string;
  filedir: string;
  path: string;
}
let commitList: CHECKRST[] = [];
const testList: CHECKRST[] = [];
const errorList: CHECKRST[] = [];

/**
 * 遍历工程目录
 * @param dir 
 * @param callback 
 */
const travel = (dir: any, callback: (pathname: string) => void) => {
  fs.readdirSync(dir).forEach((file: number) => {
    const pathname: string = path.join(dir, file.toString());
    if(fs.statSync(pathname).isDirectory()) {
      // console.log(pathname);
      travel(pathname, callback)
    } else {
      callback(pathname);
    }
  })
}

/**
 * 通过pathname获取目录及文件名
 * @param pathname 
 * @param suffix 
 * @param splitStr 
 * @returns 
 */
const getPathnameAndDir = (pathname: string, suffix: string, splitStr: string | null) => {
  const splitPaths: string[] = pathname.split('/');
  const length: number = splitPaths?.length;

  const filename = splitPaths?.[length - 1];
  const filedir = splitPaths?.[length - 2];

  return {
    filename: filename.indexOf(suffix) > -1 ? filename : null,
    filedir,
    path: splitStr ? pathname.split(splitStr)[1] : pathname
  }
}

/**
 * 异常报错，阻止提交代码
 * @param errorList 
 */
const throwErrorBeforeCommit = (errorList: CHECKRST[]) => {
  // console.log('errorList')
  // console.log(errorList)
  if(errorList?.length) {
    const unCreateTestComponent = errorList?.map((error: CHECKRST) => error.filedir);
    console.log(`您提交的以下 ${unCreateTestComponent} 页面未检测到您提交的代码中包含测试用例o(╥﹏╥)o, 请完善后提交.`);
    process.exit(1);
  } else {
    console.log('很开心您本次提交的代码中都包含了测试用例^_^');
    process.exit(0);
  }
}

/**
 * 获取本地git缓存中将要提交的数据
 */
const gitStage = () => {
  const { stdout } = execa.commandSync('git diff --cached --name-only', { cwd });
  // console.log('git commit list')
  // console.log(stdout)
  commitList = stdout.split('\n').map((pathname: string) => {
    return getPathnameAndDir(pathname, '', null) as CHECKRST;
  });
}

/**
 * 只校验需要测试用例的文件内容
 * @returns 
 */
const checkOnlyNeedTest = () => {
  // 检测本次提交是否有需要验证的文件
  const needTestFiles = commitList.filter((commit: CHECKRST) => includesDir.includes(commit.path.split('/' + commit.filedir)[0]));
  // console.log('needTestFiles')
  // console.log(needTestFiles)
  if(!needTestFiles.length) {
    return;
  }
  // if(testList)
  needTestFiles.forEach((commit: CHECKRST) => {
    if(testList.findIndex((test: CHECKRST) => test.filedir == commit.filedir && test.filename.split('.test')[0] == commit.filename.split(/\.(js|jsx|ts|tsx)/)[0]) == -1) {
      errorList.push({
        filename: commit.filename,
        filedir: commit.filedir,
        path: commit.path
      })
    }
  });
  throwErrorBeforeCommit(errorList);
}

const callTheCheckHandler = async () => {
  await travel(resolve(cwd, './test'), (pathname) => {
    testList.push(getPathnameAndDir(pathname, 'test.', cwd) as CHECKRST);
  });
  // 获取提交的文件列表
  await gitStage();
  // 检查提交的代码是否包含测试用例
  checkOnlyNeedTest();
}

callTheCheckHandler();