interface DeleteConfirmModalProps {
  selectedHparam: [any, any] | null;
  onDelete: () => void;
}

const DeleteConfirmModal = ({
  selectedHparam,
  onDelete,
}: DeleteConfirmModalProps) => {
  const isLastChoice = selectedHparam && selectedHparam[0].choices.length === 1;

  return (
    <dialog id="delete_modal" className="modal">
      <div className="modal-box w-70">
        <h3 className="font-bold text-lg">Delete this option?</h3>
        <p className="py-4 text-gray-500">
          {isLastChoice ? (
            "At least one choice should be remained."
          ) : (
            <>
              {selectedHparam
                ? `${selectedHparam[1]} will be deleted in ${selectedHparam[0].name}`
                : ""}
            </>
          )}
        </p>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn btn-ghost text-primary p-0">Close</button>
            <button
              className="btn btn-ghost text-primary p-0 pl-4"
              disabled={!!isLastChoice}
              onClick={onDelete}
            >
              Delete
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
};

export default DeleteConfirmModal;
