pipeline {
  agent any
  environment {
    VERSION = "${env.BUILD_NUMBER}"
  }
  stages {
    stage('Verify') {
      steps {
        sh '''
          npm ci
          npx prisma generate
          npm run typecheck
          npm run lint
          npm test
        '''
      }
    }

    stage('Build Images') {
      steps {
        sh """
          # The Dockerfile is multi-target: the web server, the background job
          # worker, and a one-shot migration runner all share one build.
          docker build --target web     -t secyourflow:latest        -t secyourflow:${VERSION} .
          docker build --target worker  -t secyourflow-worker:latest -t secyourflow-worker:${VERSION} .
          docker build --target migrate -t secyourflow-migrate:latest -t secyourflow-migrate:${VERSION} .
        """
      }
    }

    stage('Prepare ISO Folder') {
      steps {
        sh '''
          rm -rf secyourflow-iso
          mkdir -p secyourflow-iso/images secyourflow-iso/env secyourflow-iso/scripts

          cp -r deploy/iso/* secyourflow-iso/
          chmod +x secyourflow-iso/scripts/*.sh

          echo "Saving application images..."
          docker save -o secyourflow-iso/images/secyourflow.tar         secyourflow:latest
          docker save -o secyourflow-iso/images/secyourflow-worker.tar  secyourflow-worker:latest
          docker save -o secyourflow-iso/images/secyourflow-migrate.tar secyourflow-migrate:latest

          # Pin these to the versions deploy/iso/docker-compose.yml expects.
          echo "Pulling and saving dependencies..."
          docker pull postgres:15-alpine
          docker save -o secyourflow-iso/images/db.tar postgres:15-alpine
          docker pull redis:7-alpine
          docker save -o secyourflow-iso/images/redis.tar redis:7-alpine
        '''
      }
    }

    stage('Build ISO') {
      steps {
        sh """
          ISO_NAME="SecYourFlow-${VERSION}.iso"
          # Rock Ridge (-R) and Joliet (-J) so the media reads on Linux and Windows.
          genisoimage -o "\$ISO_NAME" -V "SECYOURFLOW" -R -J secyourflow-iso
          echo "Built: \$ISO_NAME"
        """
      }
    }

    stage('Build Update Bundle') {
      steps {
        sh """
          rm -rf secyourflow-update
          mkdir -p secyourflow-update/images
          cp secyourflow-iso/images/*.tar secyourflow-update/images/
          cp secyourflow-iso/docker-compose.yml secyourflow-update/

          BUNDLE_NAME="secyourflow-${VERSION}-bundle.zip"
          zip -r "\$BUNDLE_NAME" secyourflow-update/
          sha256sum "\$BUNDLE_NAME" > "\$BUNDLE_NAME.sha256"
          echo "Built Bundle: \$BUNDLE_NAME"
        """
      }
    }
  }

  post {
    always {
      // archiveArtifacts artifacts: '*.iso, *.zip, *.sha256', fingerprint: true
      echo "Build finished. Artifacts present in workspace."
    }
  }
}
