pipeline {
  agent any
  environment {
    VERSION = "${env.BUILD_NUMBER}"
  }
  stages {
    stage('Build Images') {
      steps {
        sh """
          # Build the main application image
          docker build -t secyourflow:latest -t secyourflow:${VERSION} .
        """
      }
    }

    stage('Prepare ISO Folder') {
      steps {
        sh """
          # Clean previous build artifacts
          rm -rf secyourflow-iso
          mkdir -p secyourflow-iso/images secyourflow-iso/env secyourflow-iso/scripts

          # Copy templates from the repository
          # Assumes the deploy/iso folder exists in the repo
          cp -r deploy/iso/* secyourflow-iso/
          
          # Fix permissions for scripts
          chmod +x secyourflow-iso/scripts/*.sh

          # Save images offline
          echo "Saving secyourflow:latest..."
          docker save -o secyourflow-iso/images/secyourflow.tar secyourflow:latest

          # Save dependencies (Postgres)
          echo "Pulling and saving postgres:16-alpine..."
          docker pull postgres:16-alpine
          docker save -o secyourflow-iso/images/db.tar postgres:16-alpine
        """
      }
    }

    stage('Build ISO') {
      steps {
        sh """
          # Install genisoimage if not present (requires sudo or pre-installed)
          # sudo apt-get update && sudo apt-get install -y genisoimage || true

          ISO_NAME="SecYourFlow-${VERSION}.iso"
          
          # Create ISO with Rock Ridge extensions (-R) and Joliet (-J) for Windows compatibility
          genisoimage -o "$ISO_NAME" -V "SECYOURFLOW" -R -J secyourflow-iso

          echo "Built: $ISO_NAME"
        """
      }
    }
    
    stage('Build Update Bundle') {
      steps {
        sh """
          # Create update bundle structure
          mkdir -p secyourflow-update/images
          
          # Copy images
          cp secyourflow-iso/images/*.tar secyourflow-update/images/
          
          # Copy docker-compose (optional, in case of updates)
          cp secyourflow-iso/docker-compose.yml secyourflow-update/
          
          # Zip it up
          BUNDLE_NAME="secyourflow-${VERSION}-bundle.zip"
          zip -r "$BUNDLE_NAME" secyourflow-update/
          
          # Checksum
          sha256sum "$BUNDLE_NAME" > "${BUNDLE_NAME}.sha256"
          
          echo "Built Bundle: $BUNDLE_NAME"
        """
      }
    }
  }

  post {
    always {
      # archiveArtifacts artifacts: '*.iso, *.zip, *.sha256', fingerprint: true
      echo "Build finished. Artifacts present in workspace."
    }
  }
}
