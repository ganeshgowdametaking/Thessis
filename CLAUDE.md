# QA Testing Rules:

* A test MUST fail when the feature is broken. No exceptions.
* NEVER inject JavaScript (`page.evaluate`) to fix UI state, bypass broken dropdowns, or force a success state.
* Use read-only assertions against observable UI state using `getByRole`, `getByText`, or `getByTestId`.
