{{flutter_js}}
{{flutter_build_config}}

_flutter.loader.load({
    serviceWorkerSettings: {
        serviceWorkerVersion: {{flutter_service_worker_version}},
    },
    onEntrypointLoaded: async function (engineInitializer) {
        const appRunner = await engineInitializer.initializeEngine();
        const loadingElement = document.getElementById('loading');
        await appRunner.runApp();
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            loadingElement.style.transition = 'opacity 0.4s ease-out';
            setTimeout(() => {
                loadingElement.remove();
            }, 400);
        }
    }
});
