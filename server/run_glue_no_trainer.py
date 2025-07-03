# coding=utf-8
# Copyright 2021 The HuggingFace Inc. team. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
""" Finetuning a 🤗 Transformers model for sequence classification on GLUE."""
import argparse
import json
import logging
import math
import os
import random
from pathlib import Path

import datasets
import torch
from datasets import load_dataset
from torch.utils.data import DataLoader
from tqdm.auto import tqdm

import evaluate
import transformers
from accelerate import Accelerator
from accelerate.logging import get_logger
from accelerate.utils import set_seed
from huggingface_hub import Repository
from transformers import (
    AutoConfig,
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    PretrainedConfig,
    SchedulerType,
    default_data_collator,
    get_scheduler,
)
from transformers import BartTokenizer, BartForSequenceClassification, BartConfig
from transformers.utils import check_min_version, get_full_repo_name, send_example_telemetry
from transformers.utils.versions import require_version
from transformers import BartTokenizer, BartForSequenceClassification
transformers.logging.set_verbosity_error()
# Will error if the minimal version of Transformers is not installed. Remove at your own risks.
check_min_version("4.25.0")
os.environ["CUDA_VISIBLE_DEVICES"] = "1"

# logger = get_logger(__name__)

require_version("datasets>=1.8.0", "To fix: pip install -r examples/pytorch/text-classification/requirements.txt")

task_to_keys = {
    "cola": ("sentence", None),
    "mnli": ("premise", "hypothesis"),
    "mrpc": ("sentence1", "sentence2"),
    "qnli": ("question", "sentence"),
    "qqp": ("question1", "question2"),
    "rte": ("sentence1", "sentence2"),
    "sst2": ("sentence", None),
    "stsb": ("sentence1", "sentence2"),
    "wnli": ("sentence1", "sentence2"),
}


def main(args):
    # args = parse_args()
    # Sending telemetry. Tracking the example usage helps us better allocate resources to maintain them. The
    # information sent is the one passed as arguments along with your Python/PyTorch versions.
    # send_example_telemetry("run_glue_no_trainer", args)

    # Initialize the accelerator. We will let the accelerator handle device placement for us in this example.
    # If we're using tracking, we also need to initialize it here and it will by default pick up all supported trackers
    # in the environment
    accelerator = (
        Accelerator()
    )
    # Make one log on every process with the configuration for debugging.
    # logging.basicConfig(
    #     format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    #     datefmt="%m/%d/%Y %H:%M:%S",
    #     level=logging.INFO,
    # )
    # logger.info(accelerator.state, main_process_only=False)
    if accelerator.is_local_main_process:
        datasets.utils.logging.set_verbosity_warning()
        transformers.utils.logging.set_verbosity_info()
    else:
        datasets.utils.logging.set_verbosity_error()
        transformers.utils.logging.set_verbosity_error()

    # If passed along, set the training seed now.
    if args['seed'] is not None:
        set_seed(args['seed'])

    # Handle the repository creation
    # if accelerator.is_main_process:
    #     if args.push_to_hub:
    #         if args.hub_model_id is None:
    #             repo_name = get_full_repo_name(Path(args.output_dir).name, token=args.hub_token)
    #         else:
    #             repo_name = args.hub_model_id
    #         repo = Repository(args.output_dir, clone_from=repo_name)

    #         with open(os.path.join(args.output_dir, ".gitignore"), "w+") as gitignore:
    #             if "step_*" not in gitignore:
    #                 gitignore.write("step_*\n")
    #             if "epoch_*" not in gitignore:
    #                 gitignore.write("epoch_*\n")
    #     elif args.output_dir is not None:
    #         os.makedirs(args.output_dir, exist_ok=True)
    accelerator.wait_for_everyone()

    # Get the datasets: you can either provide your own CSV/JSON training and evaluation files (see below)
    # or specify a GLUE benchmark task (the dataset will be downloaded automatically from the datasets Hub).

    # For CSV/JSON files, this script will use as labels the column called 'label' and as pair of sentences the
    # sentences in columns called 'sentence1' and 'sentence2' if such column exists or the first two columns not named
    # label if at least two columns are provided.

    # If the CSVs/JSONs contain only one non-label column, the script does single sentence classification on this
    # single column. You can easily tweak this behavior (see below)

    # In distributed training, the load_dataset function guarantee that only one local process can concurrently
    # download the dataset.
    if args['task_name'] is not None:
        # raw_datasets = load_dataset("glue", args['task_name'])
        raw_datasets = datasets.load_dataset( args['task_name'])
    # else:
    #     # Loading the dataset from local csv or json file.
    #     data_files = {}
    #     if args.train_file is not None:
    #         data_files["train"] = args.train_file
    #     if args.validation_file is not None:
    #         data_files["validation"] = args.validation_file
    #     extension = (args.train_file if args.train_file is not None else args.validation_file).split(".")[-1]
    #     raw_datasets = load_dataset(extension, data_files=data_files)
    # See more about loading any type of standard or custom dataset at
    # https://huggingface.co/docs/datasets/loading_datasets.html.

    # Labels
    if args['task_name'] is not None:
        label_list = raw_datasets["train"].features["label"].names
        num_labels = len(label_list)
        # is_regression = args['task_name'] == "stsb"
        # if not is_regression:
        #     label_list = raw_datasets["train"].features["label"].names
        #     num_labels = len(label_list)
        # else:
        #     num_labels = 1
    else:
        # Trying to have good defaults here, don't hesitate to tweak to your needs.
        is_regression = raw_datasets["train"].features["label"].dtype in ["float32", "float64"]
        if is_regression:
            num_labels = 1
        else:
            # A useful fast method:
            # https://huggingface.co/docs/datasets/package_reference/main_classes.html#datasets.Dataset.unique
            label_list = raw_datasets["train"].unique("label")
            label_list.sort()  # Let's sort it for determinism
            num_labels = len(label_list)

    # Load pretrained model and tokenizer
    #
    # In distributed training, the .from_pretrained methods guarantee that only one local process can concurrently
    # download model & vocab.
    # config = AutoConfig.from_pretrained(args['model_name_or_path'], num_labels=num_labels, finetuning_task=args['task_name'])
    config = BartConfig()
    config.num_labels = num_labels
    config.activation = args['activation']
    # tokenizer = AutoTokenizer.from_pretrained(args['model_name_or_path'], use_fast=not args['use_slow_tokenizer'])
    tokenizer = BartTokenizer.from_pretrained(args['model_name_or_path'])
    model = BartForSequenceClassification(config)
    # model = AutoModelForSequenceClassification.from_pretrained(
    #     args['model_name_or_path'],
    #     from_tf=bool(".ckpt" in args['model_name_or_path']),
    #     config=config,
    #     ignore_mismatched_sizes=args['ignore_mismatched_sizes'],
    # )

    # Preprocessing the datasets
    if args['task_name'] is not None:
        sentence1_key, sentence2_key = task_to_keys[args['task_name']]
    else:
        # Again, we try to have some nice defaults but don't hesitate to tweak to your use case.
        non_label_column_names = [name for name in raw_datasets["train"].column_names if name != "label"]
        if "sentence1" in non_label_column_names and "sentence2" in non_label_column_names:
            sentence1_key, sentence2_key = "sentence1", "sentence2"
        else:
            if len(non_label_column_names) >= 2:
                sentence1_key, sentence2_key = non_label_column_names[:2]
            else:
                sentence1_key, sentence2_key = non_label_column_names[0], None

    # Some models have set the order of the labels to use, so let's make sure we do use it.
    label_to_id = None
    if (
        model.config.label2id != PretrainedConfig(num_labels=num_labels).label2id
        and args['task_name'] is not None
        and not is_regression
    ):
        # Some have all caps in their config, some don't.
        label_name_to_id = {k.lower(): v for k, v in model.config.label2id.items()}
        if list(sorted(label_name_to_id.keys())) == list(sorted(label_list)):
            # logger.info(
            #     f"The configuration of the model provided the following label correspondence: {label_name_to_id}. "
            #     "Using it!"
            # )
            label_to_id = {i: label_name_to_id[label_list[i]] for i in range(num_labels)}
        # else:
            # logger.warning(
            #     "Your model seems to have been trained with labels, but they don't match the dataset: ",
            #     f"model labels: {list(sorted(label_name_to_id.keys()))}, dataset labels: {list(sorted(label_list))}."
            #     "\nIgnoring the model labels as a result.",
            # )
    elif args['task_name'] is None and not is_regression:
        label_to_id = {v: i for i, v in enumerate(label_list)}

    if label_to_id is not None:
        model.config.label2id = label_to_id
        model.config.id2label = {id: label for label, id in config.label2id.items()}
    elif args['task_name'] is not None and not is_regression:
        model.config.label2id = {l: i for i, l in enumerate(label_list)}
        model.config.id2label = {id: label for label, id in config.label2id.items()}

    padding = "max_length" if args['pad_to_max_length'] else False

    def preprocess_function(examples):
        # Tokenize the texts
        texts = (
            (examples[sentence1_key],) if sentence2_key is None else (examples[sentence1_key], examples[sentence2_key])
        )
        result = tokenizer(*texts, padding=padding, max_length=args['max_length'], truncation=True)

        if "label" in examples:
            if label_to_id is not None:
                # Map labels to IDs (not necessary for GLUE tasks)
                result["labels"] = [label_to_id[l] for l in examples["label"]]
            else:
                # In all cases, rename the column to labels because the model will expect that.
                result["labels"] = examples["label"]
        return result

    with accelerator.main_process_first():
        processed_datasets = raw_datasets.map(
            preprocess_function,
            batched=True,
            remove_columns=raw_datasets["train"].column_names,
            desc="Running tokenizer on dataset",
        )

    train_dataset = processed_datasets["train"]
    eval_dataset = processed_datasets["validation_matched" if args['task_name'] == "mnli" else "validation"]

    # Log a few random samples from the training set:
    # for index in random.sample(range(len(train_dataset)), 3):
    #     logger.info(f"Sample {index} of the training set: {train_dataset[index]}.")

    # DataLoaders creation:
    if args['pad_to_max_length']:
        # If padding was already done ot max length, we use the default data collator that will just convert everything
        # to tensors.
        data_collator = default_data_collator
    else:
        # Otherwise, `DataCollatorWithPadding` will apply dynamic padding for us (by padding to the maximum length of
        # the samples passed). When using mixed precision, we add `pad_to_multiple_of=8` to pad all tensors to multiple
        # of 8s, which will enable the use of Tensor Cores on NVIDIA hardware with compute capability >= 7.5 (Volta).
        data_collator = DataCollatorWithPadding(tokenizer, pad_to_multiple_of=(8 if accelerator.use_fp16 else None))

    train_dataloader = DataLoader(
        train_dataset, shuffle=True, collate_fn=data_collator, batch_size=args['per_device_train_batch_size']
    )
    eval_dataloader = DataLoader(eval_dataset, collate_fn=data_collator, batch_size=args['per_device_eval_batch_size'])

    # Optimizer
    # Split weights in two groups, one with weight decay and the other not.
    no_decay = ["bias", "LayerNorm.weight"]
    optimizer_grouped_parameters = [
        {
            "params": [p for n, p in model.named_parameters() if not any(nd in n for nd in no_decay)],
            "weight_decay": args['weight_decay'],
        },
        {
            "params": [p for n, p in model.named_parameters() if any(nd in n for nd in no_decay)],
            "weight_decay": 0.0,
        },
    ]
    optimizer = torch.optim.AdamW(optimizer_grouped_parameters, lr=args['learning_rate'])

    # Scheduler and math around the number of training steps.
    overrode_max_train_steps = False
    num_update_steps_per_epoch = math.ceil(len(train_dataloader) / args['gradient_accumulation_steps'])
    if args['max_train_steps'] is None:
        args['max_train_steps'] = args['num_train_epochs'] * num_update_steps_per_epoch
        overrode_max_train_steps = True

    lr_scheduler = get_scheduler(
        name=args['lr_scheduler_type'],
        optimizer=optimizer,
        num_warmup_steps=args['num_warmup_steps'],
        num_training_steps=args['max_train_steps'],
    )

    # Prepare everything with our `accelerator`.
    model, optimizer, train_dataloader, eval_dataloader, lr_scheduler = accelerator.prepare(
        model, optimizer, train_dataloader, eval_dataloader, lr_scheduler
    )

    # We need to recalculate our total training steps as the size of the training dataloader may have changed
    num_update_steps_per_epoch = math.ceil(len(train_dataloader) / args['gradient_accumulation_steps'])
    if overrode_max_train_steps:
        args['max_train_steps'] = args['num_train_epochs'] * num_update_steps_per_epoch
    # Afterwards we recalculate our number of training epochs
    args['num_train_epochs'] = math.ceil(args['max_train_steps'] / num_update_steps_per_epoch)

    # Figure out how many steps we should save the Accelerator states
    checkpointing_steps = args['checkpointing_steps']
    if checkpointing_steps is not None and checkpointing_steps.isdigit():
        checkpointing_steps = int(checkpointing_steps)

    # We need to initialize the trackers we use, and also store our configuration.
    # The trackers initializes automatically on the main process.
    # if args.with_tracking:
    #     experiment_config = vars(args)
    #     # TensorBoard cannot log Enums, need the raw value
    #     experiment_config["lr_scheduler_type"] = experiment_config["lr_scheduler_type"].value
    #     accelerator.init_trackers("glue_no_trainer", experiment_config)

    # Get the metric function
    if args['task_name'] is not None:
        metric = evaluate.load("glue", args['task_name'])
    else:
        metric = evaluate.load("accuracy")

    # Train!
    total_batch_size = args['per_device_train_batch_size'] * accelerator.num_processes * args['gradient_accumulation_steps']

    # logger.info("***** Running training *****")
    # logger.info(f"  Num examples = {len(train_dataset)}")
    # logger.info(f"  Num Epochs = {args.num_train_epochs}")
    # logger.info(f"  Instantaneous batch size per device = {args.per_device_train_batch_size}")
    # logger.info(f"  Total train batch size (w. parallel, distributed & accumulation) = {total_batch_size}")
    # logger.info(f"  Gradient Accumulation steps = {args.gradient_accumulation_steps}")
    # logger.info(f"  Total optimization steps = {args.max_train_steps}")
    # Only show the progress bar once on each machine.
    progress_bar = tqdm(range(args['max_train_steps']), disable=not accelerator.is_local_main_process)
    completed_steps = 0
    starting_epoch = 0
    # Potentially load in the weights and states from a previous save
    # if args.resume_from_checkpoint:
        # if args.resume_from_checkpoint is not None or args.resume_from_checkpoint != "":
        #     accelerator.print(f"Resumed from checkpoint: {args.resume_from_checkpoint}")
        #     accelerator.load_state(args.resume_from_checkpoint)
        #     path = os.path.basename(args.resume_from_checkpoint)
        # else:
        #     # Get the most recent checkpoint
        #     dirs = [f.name for f in os.scandir(os.getcwd()) if f.is_dir()]
        #     dirs.sort(key=os.path.getctime)
        #     path = dirs[-1]  # Sorts folders by date modified, most recent checkpoint is the last
        # # Extract `epoch_{i}` or `step_{i}`
        # training_difference = os.path.splitext(path)[0]

        # if "epoch" in training_difference:
        #     starting_epoch = int(training_difference.replace("epoch_", "")) + 1
        #     resume_step = None
        # else:
        #     resume_step = int(training_difference.replace("step_", ""))
        #     starting_epoch = resume_step // len(train_dataloader)
        #     resume_step -= starting_epoch * len(train_dataloader)

    for epoch in range(starting_epoch, args['num_train_epochs']):
        model.train()
        total_loss = 0
        for step, batch in enumerate(train_dataloader):
            # We need to skip steps until we reach the resumed step
            # if args.resume_from_checkpoint and epoch == starting_epoch:
            #     if resume_step is not None and step < resume_step:
            #         completed_steps += 1
            #         continue
            outputs = model(**batch)
            loss = outputs.loss
            # We keep track of the loss at each epoch
            total_loss += loss.detach().float()
            loss = loss / args['gradient_accumulation_steps']
            accelerator.backward(loss)
            if step % args['gradient_accumulation_steps'] == 0 or step == len(train_dataloader) - 1:
                optimizer.step()
                lr_scheduler.step()
                optimizer.zero_grad()
                progress_bar.update(1)
                completed_steps += 1

            # if isinstance(checkpointing_steps, int):
            #     if completed_steps % checkpointing_steps == 0:
            #         output_dir = f"step_{completed_steps }"
            #         # if args.output_dir is not None:
            #         #     output_dir = os.path.join(args.output_dir, output_dir)
            #         accelerator.save_state(output_dir)
            
            if completed_steps >= args['max_train_steps']:
                break
        print("epoch", epoch, "total_loss", total_loss.item() / len(train_dataloader))

    model.eval()
    samples_seen = 0
    for step, batch in enumerate(eval_dataloader):
        with torch.no_grad():
            outputs = model(**batch)
        predictions = outputs.logits.argmax(dim=-1) if not is_regression else outputs.logits.squeeze()
        predictions, references = accelerator.gather((predictions, batch["labels"]))
        # If we are in a multiprocess environment, the last batch has duplicates
        if accelerator.num_processes > 1:
            if step == len(eval_dataloader) - 1:
                predictions = predictions[: len(eval_dataloader.dataset) - samples_seen]
                references = references[: len(eval_dataloader.dataset) - samples_seen]
            else:
                samples_seen += references.shape[0]
        metric.add_batch(
            predictions=predictions,
            references=references,
        )

    eval_metric = metric.compute()
    print(f"epoch {epoch}: {eval_metric}")
        # logger.info(f"epoch {epoch}: {eval_metric}")

    #     if args.with_tracking:
    #         accelerator.log(
    #             {
    #                 "accuracy" if args.task_name is not None else "glue": eval_metric,
    #                 "train_loss": total_loss.item() / len(train_dataloader),
    #                 "epoch": epoch,
    #                 "step": completed_steps,
    #             },
    #             step=completed_steps,
    #         )

    #     if args.push_to_hub and epoch < args.num_train_epochs - 1:
    #         accelerator.wait_for_everyone()
    #         unwrapped_model = accelerator.unwrap_model(model)
    #         unwrapped_model.save_pretrained(
    #             args.output_dir, is_main_process=accelerator.is_main_process, save_function=accelerator.save
    #         )
    #         if accelerator.is_main_process:
    #             tokenizer.save_pretrained(args.output_dir)
    #             repo.push_to_hub(
    #                 commit_message=f"Training in progress epoch {epoch}", blocking=False, auto_lfs_prune=True
    #             )

    #     if args.checkpointing_steps == "epoch":
    #         output_dir = f"epoch_{epoch}"
    #         if args.output_dir is not None:
    #             output_dir = os.path.join(args.output_dir, output_dir)
    #         accelerator.save_state(output_dir)

    # if args.with_tracking:
    #     accelerator.end_training()

    # if args.output_dir is not None:
    #     accelerator.wait_for_everyone()
    #     unwrapped_model = accelerator.unwrap_model(model)
    #     unwrapped_model.save_pretrained(
    #         args.output_dir, is_main_process=accelerator.is_main_process, save_function=accelerator.save
    #     )
    #     if accelerator.is_main_process:
    #         tokenizer.save_pretrained(args.output_dir)
    #         if args.push_to_hub:
    #             repo.push_to_hub(commit_message="End of training", auto_lfs_prune=True)

    # if args.task_name == "mnli":
    #     # Final evaluation on mismatched validation set
    #     eval_dataset = processed_datasets["validation_mismatched"]
    #     eval_dataloader = DataLoader(
    #         eval_dataset, collate_fn=data_collator, batch_size=args.per_device_eval_batch_size
    #     )
    #     eval_dataloader = accelerator.prepare(eval_dataloader)

    #     model.eval()
    #     for step, batch in enumerate(eval_dataloader):
    #         outputs = model(**batch)
    #         predictions = outputs.logits.argmax(dim=-1)
    #         metric.add_batch(
    #             predictions=accelerator.gather(predictions),
    #             references=accelerator.gather(batch["labels"]),
    #         )

    #     eval_metric = metric.compute()
    #     logger.info(f"mnli-mm: {eval_metric}")

    # if args.output_dir is not None:
    #     all_results = {f"eval_{k}": v for k, v in eval_metric.items()}
    #     with open(os.path.join(args.output_dir, "all_results.json"), "w") as f:
    #         json.dump(all_results, f)

if __name__ == "__main__":
    args = {
        "task_name": "jeanlee/kmhas_korean_hate_speech", # 고정
        "max_length": 128, # 이거
        "model_name_or_path": "facebook/bart-base", # 고정
        "activation": "silu", # "gelu", "relu", "silu" and "gelu_new"
        "per_device_train_batch_size": 8,
        "per_device_eval_batch_size": 8,
        "learning_rate": 5e-5, # 이거
        "num_train_epochs": 3, # budget
        "weight_decay": 0.0, # 이거
        "gradient_accumulation_steps": 1,
        "lr_scheduler_type": "linear", # 이거
        "num_warmup_steps": 0,
        "report_to": "all",
        "use_slow_tokenizer": False,
        "ignore_mismatched_sizes": False,
        "pad_to_max_length": False,
        "max_train_steps": None,
        "checkpointing_steps": None,
        "resume_from_checkpoint": None,
        "with_tracking": False,
        "push_to_hub": False,
        "seed": 42,
    }
    main(args)

# qnli는 pretrained=False로 하면 30분걸림 | pretrained=True 10분? 근데 90%찍음
