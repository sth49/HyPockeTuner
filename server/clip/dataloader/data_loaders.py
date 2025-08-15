from torch.utils.data import Dataset, DataLoader, RandomSampler, SequentialSampler


def get_dataloader(config, dataset, is_train = True):
    
    # 훈련 시 랜덤 셔플 
    if is_train:
        sampler = RandomSampler(dataset)
        # GPU 수를 고려하여 전체 배치 사이즈 계산 
        # GPU 2개면, per_gpu_train_batchszie =1 16 -> batch_size = 32
        batch_size = config.per_gpu_train_batch_size * max(1, config.n_gpu)
    # 평가 추론시 순차적으로 데이터 로드
    else:
        sampler = SequentialSampler(dataset)
        batch_size = config.per_gpu_eval_batch_size * max(1, config.n_gpu)

    dataloader = DataLoader(dataset, sampler=sampler, 
            batch_size=batch_size, num_workers=config.num_workers)

    return dataloader