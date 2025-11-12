# MyWeb

### 简介

* 用于集成一些用AI工具生成小游戏和常用功能，方便日常开发使用
* AI工具： 主要使用 Codebuddy 和 Copilot
* 网页部署地址：http://113.44.46.69:8080

### 使用AI编程工具

* ![使用 Copilot 生成网页工具](https://github.com/ahuang007/MyWeb/blob/master/copilot_tool.jpg)
* ![使用 CodeBuddy 生成网页游戏](https://github.com/ahuang007/MyWeb/blob/master/codebuddy.jpg)

### 部署(Deploy)

1. 一台服务器，安装docker, 安装docker-compose, 安装git
2. 使用git下载项目代码到本地MyWeb文件夹
3. 修改docker-compose.yml文件，修改镜像名称和端口号和文件夹名称
```yaml
version: '3'
services:
  nginx:
    image: nginx:1.20.0
    container_name: nginx
    ports:
      - 8080:80
    volumes:
      - ./MyWeb/:/usr/share/nginx/html
```
4. 运行docker-compose up -d 命令，启动容器
5. 访问 http://113.44.46.69:8080 查看网页

### 持续集成(DevOps)

1. 整理自己的想法和需求
2. 使用AI工具（Copilot、CodeBuddy、Cursor 等）生成代码
3. 测试与优化完善功能
4. 提交到仓库目录 git add / git commit
5. 推送到远程仓库 git push
6. 发布更新最新功能 git pull
