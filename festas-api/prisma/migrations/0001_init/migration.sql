-- CreateTable
CREATE TABLE `kits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(191) NOT NULL,
    `tema` VARCHAR(191) NULL,
    `descricao` TEXT NULL,
    `preco_locacao` DECIMAL(10, 2) NOT NULL,
    `imagem_url` TEXT NULL,
    `itens` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservas` (
    `id` VARCHAR(191) NOT NULL,
    `kit_id` INTEGER NOT NULL,
    `kit_nome` VARCHAR(191) NOT NULL,
    `data_evento` DATE NOT NULL,
    `periodo` VARCHAR(191) NOT NULL DEFAULT 'dia',
    `cliente_nome` VARCHAR(191) NOT NULL,
    `cliente_whatsapp` VARCHAR(191) NOT NULL,
    `endereco` TEXT NULL,
    `distancia_km` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `taxa_entrega` DECIMAL(10, 2) NOT NULL,
    `taxa_montagem` DECIMAL(10, 2) NOT NULL,
    `valor_kit` DECIMAL(10, 2) NOT NULL,
    `valor_total` DECIMAL(10, 2) NOT NULL,
    `metodo_pagamento` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    `pagamento_id` VARCHAR(191) NULL,
    `obs` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `reservas_data_evento_idx`(`data_evento`),
    INDEX `reservas_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bloqueios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `data` DATE NOT NULL,
    `motivo` VARCHAR(191) NULL,

    UNIQUE INDEX `bloqueios_data_key`(`data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `config` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `nome_negocio` VARCHAR(191) NOT NULL,
    `taxa_montagem` DECIMAL(10, 2) NOT NULL,
    `taxa_entrega_base` DECIMAL(10, 2) NOT NULL,
    `taxa_entrega_km` DECIMAL(10, 2) NOT NULL,
    `antecedencia_min_dias` INTEGER NOT NULL,
    `atualizado_em` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `senha_hash` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reservas` ADD CONSTRAINT `reservas_kit_id_fkey` FOREIGN KEY (`kit_id`) REFERENCES `kits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

