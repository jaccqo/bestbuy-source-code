import asyncio
import threading
from typing import Any, Coroutine, Optional

import time

class AsyncRunner:
    """
    Runs a single asyncio event loop in a background thread.
    Safe for Playwright on Windows.
    Supports timeouts and graceful shutdown.
    """
    def __init__(self):
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.thread: Optional[threading.Thread] = None
        self._start_loop()

    def _start_loop(self):
        def _run():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_forever()

        self.thread = threading.Thread(target=_run, daemon=True)
        self.thread.start()

        # Wait until loop is ready
        while self.loop is None:
            time.sleep(0.01)

    def run(self, coro: Coroutine, timeout: Optional[float] = None) -> Any:
        """
        Run a coroutine in the background loop.
        :param coro: Coroutine to run
        :param timeout: Max seconds to wait for completion. None = wait forever
        :return: Result of the coroutine
        """
        if not self.loop:
            raise RuntimeError("Event loop not initialized")
        future = asyncio.run_coroutine_threadsafe(coro, self.loop)
        try:
            return future.result(timeout=timeout)
        except asyncio.TimeoutError:
            future.cancel()
            raise TimeoutError(f"Coroutine did not complete within {timeout} seconds")
        except Exception as e:
            raise e

    def shutdown(self, timeout: float = 10):
        """
        Stop the background loop and thread gracefully.
        """
        if not self.loop:
            return
        stop_future = asyncio.run_coroutine_threadsafe(self._stop_loop(), self.loop)
        try:
            stop_future.result(timeout=timeout)
        except Exception:
            pass
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=timeout)

    async def _stop_loop(self):
        await asyncio.sleep(0)  # Yield control
        self.loop.stop()
