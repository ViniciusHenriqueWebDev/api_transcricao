pipeline {
    agent any
    
    environment {
        BACKEND_PATH = '/home/deploy/empresa/backend'
        FRONTEND_PATH = '/home/deploy/empresa/frontend'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '📥 Baixando código do repositório...'
                checkout scm
            }
        }
        
        stage('Backend - Build') {
            steps {
                echo '🔧 Building Backend...'
                dir('backend') {
                    sh '''
                        npm install
                        npm run build
                    '''
                }
            }
        }
        
        stage('Frontend - Build') {
            steps {
                echo '🔧 Building Frontend...'
                dir('frontend') {
                    sh '''
                        npm install --legacy-peer-deps
                        npm run build
                    '''
                }
            }
        }
        
        stage('Deploy Files') {
            steps {
                echo '📦 Copiando arquivos para produção...'
                sh """
                    # Copiar backend (preservando .env e node_modules)
                    rsync -av --exclude='node_modules' --exclude='.env' --delete \
                        backend/ ${BACKEND_PATH}/
                    
                    # Copiar frontend (preservando .env e node_modules)
                    rsync -av --exclude='node_modules' --exclude='.env' --delete \
                        frontend/ ${FRONTEND_PATH}/
                """
            }
        }
        
        stage('Restart PM2') {
            steps {
                echo '🔄 Reiniciando/iniciando serviços PM2...'
                sh '''
                    # Reiniciar se existir; caso contrário, iniciar backend e frontend
                    pm2 restart empresa-backend || pm2 start npm --name empresa-backend -- start --cwd ${BACKEND_PATH}
                    pm2 restart empresa-frontend || pm2 start npm --name empresa-frontend -- start --cwd ${FRONTEND_PATH}
                    sleep 3
                    pm2 status
                '''
            }
        }
    }
    
    post {
        success {
            echo '✅ Deploy realizado com sucesso!'
            sh '''
                echo "=== STATUS DOS SERVIÇOS ==="
                pm2 list
            '''
        }
        failure {
            echo '❌ Falha no deploy!'
            sh '''   
                echo "=== LOGS DE ERRO ==="
                pm2 logs --err --lines 30 --nostream
            '''
        }
        always {
            echo '🧹 Limpando workspace...'
            cleanWs()
        }
    }
}