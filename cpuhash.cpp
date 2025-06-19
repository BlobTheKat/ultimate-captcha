// Example program
#include <iostream>
#include <string>
#include <atomic>
#include <thread>
#include <chrono>
#include <iomanip>
using namespace std;
typedef uint32_t uint;

uint heap[1<<26];

uint kernel(uint id){
	uint ret = 0u;
	for(int i=0;i<1048576;i++){
		id = heap[id&67108863];
		ret ^= id;
	}
	return ret;
}
atomic_uint at; int top;
atomic<uint64_t> totalTime;
atomic_uint total;
void work(){
	uint id, hash = 0;
	auto t0 = chrono::high_resolution_clock::now();
	while((id = at++) < top) hash += kernel(id);
	totalTime += (chrono::high_resolution_clock::now() - t0).count();
	total += hash;
}

int main(){
	uint xsh = 9999;
	if(!xsh) xsh = 0xFFFFFFFF;
	for(int i=0;i<(1<<26);i++){
		heap[i] = xsh;
		xsh ^= xsh << 13;
		xsh ^= xsh >> 17;
		xsh ^= xsh << 5;
	}
	top = 256; at = 0;
	long long thc = thread::hardware_concurrency();
	thread* ths = new thread[thc];
	for(int i=0;i<thc;i++) ths[i] = thread(work);
	for(int i=0;i<thc;i++) ths[i].join();
	cout << double(totalTime)/1'000'000 << "ms" << endl;
	cout << "hash: " << setfill('0') << setw(8) << hex << total << endl;
}